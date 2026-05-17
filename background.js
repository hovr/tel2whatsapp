importScripts('country-data.js');

const MENU_ID = "open-in-whatsapp";
const SELECTED_COUNTRY_KEY = 'selectedCountryCode';
const MIN_PHONE_DIGITS = 7;
const MAX_PHONE_DIGITS = 15;
const VERSION_CHECK_ALARM_NAME = 'daily-version-check';
const VERSION_CHECK_PERIOD_MINUTES = 24 * 60;
const VERSION_UPDATE_STATUS_KEY = 'versionUpdateStatus';
const LATEST_MANIFEST_URL = 'https://raw.githubusercontent.com/hovr/tel2whatsapp/main/manifest.json';
const RELEASES_URL = 'https://github.com/hovr/tel2whatsapp/blob/main/README.md';
const DEFAULT_ICON_PATHS = {
  16: 'icons/whatsapp-16.png',
  32: 'icons/whatsapp-32.png',
  48: 'icons/whatsapp-48.png',
  128: 'icons/whatsapp-128.png'
};
const UPDATE_ICON_PATHS = {
  16: 'icons/whatsapp-update-16.png',
  32: 'icons/whatsapp-update-32.png',
  48: 'icons/whatsapp-update-48.png',
  128: 'icons/whatsapp-update-128.png'
};

const compareVersions = (currentVersion, latestVersion) => {
  const currentParts = String(currentVersion || '').split('.').map((part) => Number.parseInt(part, 10) || 0);
  const latestParts = String(latestVersion || '').split('.').map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(currentParts.length, latestParts.length);

  for (let index = 0; index < length; index += 1) {
    const currentPart = currentParts[index] || 0;
    const latestPart = latestParts[index] || 0;
    if (latestPart > currentPart) {
      return 1;
    }
    if (latestPart < currentPart) {
      return -1;
    }
  }

  return 0;
};

async function setVersionUpdateBadge(hasUpdate) {
  try {
    await chrome.action.setBadgeText({ text: '' });
    await chrome.action.setIcon({ path: hasUpdate ? UPDATE_ICON_PATHS : DEFAULT_ICON_PATHS });
  } catch (error) {
    console.debug('Could not update version icon:', error?.message || error);
  }
}

async function checkForVersionUpdateInBackground() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    let response;
    try {
      response = await fetch(`${LATEST_MANIFEST_URL}?t=${Date.now()}`, {
        cache: 'no-store',
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      return;
    }

    const remoteManifest = await response.json();
    const currentVersion = chrome.runtime.getManifest().version;
    const latestVersion = remoteManifest?.version || '';
    const hasUpdate = Boolean(latestVersion && compareVersions(currentVersion, latestVersion) > 0);

    await chrome.storage.local.set({
      [VERSION_UPDATE_STATUS_KEY]: {
        hasUpdate,
        latestVersion,
        currentVersion,
        releasesUrl: RELEASES_URL,
        checkedAt: Date.now()
      }
    });
    await setVersionUpdateBadge(hasUpdate);
  } catch (error) {
    console.debug('Background version check skipped:', error?.message || error);
  }
}

function scheduleVersionUpdateChecks() {
  chrome.alarms.create(VERSION_CHECK_ALARM_NAME, {
    delayInMinutes: 1,
    periodInMinutes: VERSION_CHECK_PERIOD_MINUTES
  });
}

async function restoreVersionUpdateIconState() {
  try {
    const currentVersion = chrome.runtime.getManifest().version;
    const stored = await chrome.storage.local.get(VERSION_UPDATE_STATUS_KEY);
    const status = stored?.[VERSION_UPDATE_STATUS_KEY];
    if (status?.currentVersion === currentVersion) {
      await setVersionUpdateBadge(Boolean(status.hasUpdate));
    }
  } catch (error) {
    console.debug('Could not restore version icon state:', error?.message || error);
  }
}

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

function isPlausiblePhoneNumber(normalizedNumber) {
  if (!normalizedNumber) {
    return false;
  }

  return normalizedNumber.length >= MIN_PHONE_DIGITS && normalizedNumber.length <= MAX_PHONE_DIGITS;
}

function showInvalidPhoneAlert(tabId) {
  if (!tabId || !chrome.scripting?.executeScript) {
    return;
  }

  chrome.scripting.executeScript({
    target: { tabId },
    func: () => alert('Please highlight a valid phone number or right-click a tel link & try again.')
  }).catch((error) => {
    console.debug('Could not show invalid phone alert:', error?.message || error);
  });
}

function normalizePhoneNumber(rawValue, country) {
  if (!rawValue) {
    return null;
  }

  const trimmedValue = rawValue.trim().replace(/\(\s*0\s*\)/g, '');
  const compactValue = trimmedValue.replace(/[\s().-]/g, '');

  if (compactValue.startsWith('+')) {
    return digitsOnly(compactValue) || null;
  }

  const digits = digitsOnly(compactValue);
  if (!digits) {
    return null;
  }

  if (digits.startsWith('00') && digits.length > 2) {
    return digits.replace(/^00+/, '') || null;
  }

  if (!country?.dialCode) {
    return digits;
  }

  if (digits.startsWith(country.dialCode) && digits.length > country.dialCode.length + 5) {
    return digits;
  }

  const localDigits = country.keepLeadingZero ? digits : digits.replace(/^0+/, '');
  return `${country.dialCode}${localDigits}`;
}

function extractPhoneNumber(info) {
  if (info.linkUrl?.toLowerCase().startsWith("tel:")) {
    const telValue = info.linkUrl.slice(4);
    const [numberPart, ...parameterParts] = telValue.split(';');
    const phoneContext = parameterParts
      .map((part) => part.split('='))
      .find(([key]) => key?.toLowerCase() === 'phone-context')?.[1];
    let decodedPhoneContext = '';
    if (phoneContext) {
      try {
        decodedPhoneContext = decodeURIComponent(phoneContext);
      } catch (error) {
        console.debug('Ignoring malformed tel phone-context:', error?.message || error);
      }
    }

    if (decodedPhoneContext.startsWith('+') && numberPart && !numberPart.startsWith('+')) {
      return `${decodedPhoneContext}${numberPart.replace(/^0+/, '')}`;
    }

    return numberPart.split(/[?#]/)[0];
  }

  if (info.selectionText) {
    return info.selectionText;
  }

  return null;
}

function openInWhatsApp(info, tab) {
  chrome.storage.local.get(SELECTED_COUNTRY_KEY, (stored) => {
    if (chrome.runtime.lastError) {
      console.debug('Failed to read selected country:', chrome.runtime.lastError.message);
    }

    const rawPhoneNumber = extractPhoneNumber(info);
    const selectedCountry = Tel2WhatsAppCountryData.findCountryByCode(stored?.[SELECTED_COUNTRY_KEY]);
    const normalizedNumber = normalizePhoneNumber(rawPhoneNumber, selectedCountry);

    if (!isPlausiblePhoneNumber(normalizedNumber)) {
      showInvalidPhoneAlert(tab?.id);
      return;
    }

    chrome.tabs.create({
      url: `https://wa.me/${normalizedNumber}`
    }, () => {
      if (chrome.runtime.lastError) {
        console.debug('Failed to open WhatsApp:', chrome.runtime.lastError.message);
      }
    });
  });
}

function setupContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: "Open in WhatsApp",
      contexts: ["selection", "link"]
    });
  });
}

restoreVersionUpdateIconState();

chrome.runtime.onInstalled.addListener(() => {
  setupContextMenu();
  scheduleVersionUpdateChecks();
  checkForVersionUpdateInBackground();
});
chrome.runtime.onStartup.addListener(() => {
  setupContextMenu();
  scheduleVersionUpdateChecks();
  checkForVersionUpdateInBackground();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === VERSION_CHECK_ALARM_NAME) {
    checkForVersionUpdateInBackground();
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.action === 'versionUpdateStatusChanged') {
    setVersionUpdateBadge(Boolean(message.hasUpdate));
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID) {
    return;
  }

  openInWhatsApp(info, tab);
});

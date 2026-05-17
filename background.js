importScripts('country-data.js');

const MENU_ID = "open-in-whatsapp";
const SELECTED_COUNTRY_KEY = 'selectedCountryCode';
const MIN_PHONE_DIGITS = 7;
const MAX_PHONE_DIGITS = 15;

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
    func: () => alert('Please highlight a valid phone number or right-click a tel link before opening WhatsApp.')
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
    const decodedPhoneContext = phoneContext ? decodeURIComponent(phoneContext) : '';

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

chrome.runtime.onInstalled.addListener(setupContextMenu);
chrome.runtime.onStartup.addListener(setupContextMenu);
setupContextMenu();

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId !== MENU_ID) {
    return;
  }

  openInWhatsApp(info, tab);
});

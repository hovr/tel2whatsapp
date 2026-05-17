importScripts('country-data.js');

const MENU_ID = "open-in-whatsapp";
const COUNTRY_LOOKUP_URL = 'https://api.country.is/';
const IPAPI_LOOKUP_URL = 'https://ipapi.co/json/';
const SELECTED_COUNTRY_KEY = 'selectedCountryCode';
const IP_COUNTRY_KEY = 'ipCountryInfo';
const IP_COUNTRY_CHECKED_AT_KEY = 'ipCountryCheckedAt';
const IP_COUNTRY_CACHE_VERSION = 2;
const IP_COUNTRY_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const storageGet = (keys) => chrome.storage.local.get(keys);
const storageSet = (values) => chrome.storage.local.set(values);

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
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

async function fetchIpCountryInfo() {
  const stored = await storageGet([IP_COUNTRY_KEY, IP_COUNTRY_CHECKED_AT_KEY]);
  const cachedAt = stored[IP_COUNTRY_CHECKED_AT_KEY] || 0;
  if (
    stored[IP_COUNTRY_KEY]?.cacheVersion === IP_COUNTRY_CACHE_VERSION &&
    Date.now() - cachedAt < IP_COUNTRY_CACHE_TTL_MS
  ) {
    return stored[IP_COUNTRY_KEY];
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const lookupUrls = [COUNTRY_LOOKUP_URL, IPAPI_LOOKUP_URL];
    let countryCode = '';
    let countryName = '';

    for (const lookupUrl of lookupUrls) {
      try {
        const response = await fetch(lookupUrl, {
          cache: 'no-store',
          signal: controller.signal
        });

        if (!response.ok) {
          continue;
        }

        const data = await response.json();
        countryCode = String(data?.country || data?.country_code || '').toUpperCase();
        countryName = data?.country_name || '';

        if (countryCode) {
          break;
        }
      } catch (error) {
        console.debug('Country lookup skipped:', error?.message || error);
      }
    }

    const country = Tel2WhatsAppCountryData.findCountryByCode(countryCode);
    if (!country) {
      return null;
    }

    const info = {
      countryCode: country.code,
      countryName: countryName || country.name,
      dialCode: country.dialCode,
      cacheVersion: IP_COUNTRY_CACHE_VERSION
    };

    await storageSet({
      [IP_COUNTRY_KEY]: info,
      [IP_COUNTRY_CHECKED_AT_KEY]: Date.now()
    });

    return info;
  } catch (error) {
    console.debug('IP country check skipped:', error?.message || error);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function getSelectedCountry() {
  const stored = await storageGet(SELECTED_COUNTRY_KEY);
  const selectedCountry = Tel2WhatsAppCountryData.findCountryByCode(stored[SELECTED_COUNTRY_KEY]);
  if (selectedCountry) {
    return selectedCountry;
  }

  const ipInfo = await fetchIpCountryInfo();
  const ipCountry = Tel2WhatsAppCountryData.findCountryByCode(ipInfo?.countryCode);
  if (ipCountry) {
    await storageSet({ [SELECTED_COUNTRY_KEY]: ipCountry.code });
    return ipCountry;
  }

  return null;
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: "Open in WhatsApp",
    contexts: ["selection", "link"]
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId !== MENU_ID) {
    return;
  }

  (async () => {
    try {
      const rawPhoneNumber = extractPhoneNumber(info);
      const selectedCountry = await getSelectedCountry();
      const normalizedNumber = normalizePhoneNumber(rawPhoneNumber, selectedCountry);

      if (!normalizedNumber) {
        return;
      }

      chrome.tabs.create({
        url: `https://wa.me/${normalizedNumber}`
      });
    } catch (error) {
      console.error('Failed to open WhatsApp:', error);
    }
  })();
});

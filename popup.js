const COUNTRY_LOOKUP_URL = 'https://api.country.is/';
const IPAPI_LOOKUP_URL = 'https://ipapi.co/json/';
const SELECTED_COUNTRY_KEY = 'selectedCountryCode';
const IP_COUNTRY_KEY = 'ipCountryInfo';
const IP_COUNTRY_CHECKED_AT_KEY = 'ipCountryCheckedAt';
const IP_COUNTRY_CACHE_VERSION = 2;
const IP_COUNTRY_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const storageGet = (keys) => chrome.storage.local.get(keys);
const storageSet = (values) => chrome.storage.local.set(values);

const countrySelect = document.getElementById('countrySelect');
const countryStatus = document.getElementById('countryStatus');
const recheckIpButton = document.getElementById('recheckIpButton');

function setCountryStatus(message, type = 'info') {
  if (!countryStatus) {
    return;
  }
  countryStatus.textContent = message || '';
  countryStatus.className = type ? `status ${type}` : 'status';
  countryStatus.style.display = message ? 'block' : 'none';
}

function getSelectedCountry() {
  return Tel2WhatsAppCountryData.findCountryByCode(countrySelect?.value);
}

function renderCountryOptions() {
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Choose a country…';
  countrySelect.append(placeholder);

  Tel2WhatsAppCountryData.sortedCountries().forEach((country) => {
    const option = document.createElement('option');
    option.value = country.code;
    option.textContent = Tel2WhatsAppCountryData.getCountryLabel(country);
    countrySelect.append(option);
  });
}

async function fetchIpCountryInfo(force = false) {
  if (!force) {
    const stored = await storageGet([IP_COUNTRY_KEY, IP_COUNTRY_CHECKED_AT_KEY]);
    const cachedAt = stored[IP_COUNTRY_CHECKED_AT_KEY] || 0;
    if (
      stored[IP_COUNTRY_KEY]?.cacheVersion === IP_COUNTRY_CACHE_VERSION &&
      Date.now() - cachedAt < IP_COUNTRY_CACHE_TTL_MS
    ) {
      return stored[IP_COUNTRY_KEY];
    }
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
      throw new Error('IP lookup did not return a supported country');
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
  } finally {
    clearTimeout(timeoutId);
  }
}

function renderIpComparison(ipInfo) {
  const selectedCountry = getSelectedCountry();
  const ipCountry = Tel2WhatsAppCountryData.findCountryByCode(ipInfo?.countryCode);

  if (!selectedCountry) {
    setCountryStatus('Choose a default country so local numbers can be converted for WhatsApp.', 'info');
    return;
  }

  if (!ipCountry) {
    setCountryStatus('Could not check your IP country. Your saved selection will still be used.', 'info');
    return;
  }

  if (selectedCountry.code !== ipCountry.code) {
    setCountryStatus(
      `Heads up: your saved country is ${Tel2WhatsAppCountryData.getCountryLabel(selectedCountry)}, but your current IP appears to be ${Tel2WhatsAppCountryData.getCountryLabel(ipCountry)}. If you are using a VPN, keep your saved country.`,
      'warning'
    );
    return;
  }

  setCountryStatus(`IP check matches your saved country: ${Tel2WhatsAppCountryData.getCountryLabel(selectedCountry)}.`, 'success');
}

async function initializeCountrySelect() {
  renderCountryOptions();

  const stored = await storageGet(SELECTED_COUNTRY_KEY);
  let selectedCountry = Tel2WhatsAppCountryData.findCountryByCode(stored[SELECTED_COUNTRY_KEY]);

  try {
    const ipInfo = await fetchIpCountryInfo();
    const ipCountry = Tel2WhatsAppCountryData.findCountryByCode(ipInfo?.countryCode);

    if (!selectedCountry && ipCountry) {
      selectedCountry = ipCountry;
      await storageSet({ [SELECTED_COUNTRY_KEY]: selectedCountry.code });
    }

    if (selectedCountry) {
      countrySelect.value = selectedCountry.code;
    }

    renderIpComparison(ipInfo);
  } catch (error) {
    if (selectedCountry) {
      countrySelect.value = selectedCountry.code;
    }
    setCountryStatus(
      selectedCountry
        ? 'IP country check unavailable. Your saved selection will still be used.'
        : 'IP country check unavailable. Choose a default country so local numbers can be converted.',
      'info'
    );
    console.debug('IP country check skipped:', error?.message || error);
  }
}

countrySelect?.addEventListener('change', async () => {
  if (!countrySelect.value) {
    return;
  }

  await storageSet({ [SELECTED_COUNTRY_KEY]: countrySelect.value });
  const stored = await storageGet(IP_COUNTRY_KEY);
  renderIpComparison(stored[IP_COUNTRY_KEY]);
});

recheckIpButton?.addEventListener('click', async () => {
  recheckIpButton.disabled = true;
  setCountryStatus('Checking your current IP country…', 'info');

  try {
    const ipInfo = await fetchIpCountryInfo(true);
    renderIpComparison(ipInfo);
  } catch (error) {
    setCountryStatus('IP country check unavailable. Try again later or keep your saved country.', 'info');
    console.debug('IP country recheck skipped:', error?.message || error);
  } finally {
    recheckIpButton.disabled = false;
  }
});

document.addEventListener('DOMContentLoaded', () => {
  checkForNewerVersion(document.getElementById('versionNotice'));
  initializeCountrySelect();
});

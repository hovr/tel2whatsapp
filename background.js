const MENU_ID = "open-in-whatsapp";

function normalizePhoneNumber(rawValue) {
  if (!rawValue) {
    return null;
  }

  const trimmedValue = rawValue.trim();
  const digitsOnly = trimmedValue.replace(/\D/g, "");

  return digitsOnly || null;
}

function extractPhoneNumber(info) {
  if (info.linkUrl?.toLowerCase().startsWith("tel:")) {
    return info.linkUrl.slice(4);
  }

  if (info.selectionText) {
    return info.selectionText;
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

  const rawPhoneNumber = extractPhoneNumber(info);
  const normalizedNumber = normalizePhoneNumber(rawPhoneNumber);

  if (!normalizedNumber) {
    return;
  }

  chrome.tabs.create({
    url: `https://wa.me/${normalizedNumber}`
  });
});

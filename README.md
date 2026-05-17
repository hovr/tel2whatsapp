# Tel2WhatsApp

This is a small Chrome extension that adds a right-click option called **Open in WhatsApp**.

It is useful when you see a phone number on a website and want to open a WhatsApp chat with that number without saving it to your contacts first.

## What it does

After the extension is installed, you can:

- Highlight a phone number on a web page, right-click it, and choose **Open in WhatsApp**
- Right-click a phone number link on a website and choose **Open in WhatsApp**

Chrome will then open WhatsApp Web in a new tab using that number.

## Before you start

You will need:

- Google Chrome
- This extension folder saved on your computer somewhere
- A WhatsApp account and WhatsApp installed on your Mac/PC

You do **not** need to install any extra software or type any code commands.

## How to install it in Chrome

### 1. Open Chrome extensions

In Chrome, open this address:

`chrome://extensions`

You can copy and paste that into the address bar at the top of Chrome.

### 2. Turn on Developer mode

At the top right of the Extensions page, switch on **Developer mode**.

This sounds technical, but for this kind of extension it is just what allows Chrome to load it from a folder.

### 3. Load the extension

Click **Load unpacked**.

When a folder window opens, choose the project folder:

`tel2whatsapp`

Then click **Open**.

### 4. Check that it loaded

You should now see **Tel2WhatsApp** in your list of Chrome extensions.

If you can see it there, the setup is complete.

## How to use it

### Option 1: From selected text

1. Open any web page that shows a phone number
2. Highlight the phone number with your mouse
3. Right-click the highlighted number
4. Click **Open in WhatsApp**

Example of the menu you should see:

![Right-click menu showing the Open in WhatsApp option](screenshots/menu.jpg)

### Option 2: From a phone link

Some websites make phone numbers clickable.

1. Move your mouse over the phone number link
2. Right-click it
3. Click **Open in WhatsApp**

## What happens next

Chrome opens a new tab to WhatsApp using that number.

If you are already signed into WhatsApp Web, you should be able to start chatting straight away.

If you are not signed in yet, WhatsApp may first ask you to log in.

## Phone number formatting

The extension cleans up phone numbers before opening WhatsApp. It removes spaces, brackets, dashes, and other symbols.

It also supports local numbers by using a saved default country.

Open the extension popup to choose your default country, for example:

`🇬🇧 United Kingdom (+44)`

You can also click **Auto update Country** to detect your current country from your IP address and save it automatically.

Examples:

- `00441234223388` opens as `+441234223388`
- `01234223388` with United Kingdom selected opens as `+441234223388`
- `79374065` with Guatemala selected opens as `+50279374065`

If your selected country does not match the country detected from your IP address, the popup will show a warning. If you are using a VPN it could be the issue.

## Troubleshooting

### The right-click option does not appear

Try these steps:

1. Make sure the extension is visible on `chrome://extensions`
2. Refresh the web page you are on
3. Try selecting the number again before right-clicking

### WhatsApp opens, but the chat does not work

This usually means the number is not in the right format.

Check that:

- The number is a real mobile number
- The selected text is actually the phone number and not extra words or symbols
- The correct default country is selected in the extension popup for local numbers

If the selected text is empty or does not look like a phone number, the extension will show an alert asking you to highlight a valid phone number or right-click a tel link and try again.

### The extension disappeared after restarting Chrome

Go back to:

`chrome://extensions`

If it is turned off, switch it back on.

If the project folder was moved or deleted, Chrome may need you to load it again using **Load unpacked**.

## Updating the extension after changes

If someone updates the files in this folder, you can refresh the extension like this:

1. Open `chrome://extensions`
2. Find **Tel2WhatsApp**
3. Click the refresh/reload icon on its card

## Removing the extension

1. Open `chrome://extensions`
2. Find **Tel2WhatsApp**
3. Click **Remove**

## Files in this project

- `manifest.json` tells Chrome basic information about the extension
- `background.js` handles the right-click menu and opens WhatsApp
- `popup.html` and `popup.js` show a small extension popup
- `version-check.js` checks GitHub for a newer version and shows an update link when one is available
- `country-data.js` contains the country names, flags, and dialing codes used by the popup
- `scripts/bump-version.js` and `scripts/install-hooks.sh` help automatically bump the extension version before commits

If you only want to use the extension, you do not need to edit these files.

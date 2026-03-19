# Tel to WhatsApp

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
- This extension folder on your computer
- A WhatsApp account

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

When a folder window opens, choose this project folder:

`tel2whatsapp`

Then click **Open**.

### 4. Check that it loaded

You should now see **Tel to WhatsApp** in your list of Chrome extensions.

If you can see it there, the setup is complete.

## How to use it

### Option 1: From selected text

1. Open any web page that shows a phone number
2. Highlight the phone number with your mouse
3. Right-click the highlighted number
4. Click **Open in WhatsApp**

### Option 2: From a phone link

Some websites make phone numbers clickable.

1. Move your mouse over the phone number link
2. Right-click it
3. Click **Open in WhatsApp**

## What happens next

Chrome opens a new tab to WhatsApp using that number.

If you are already signed into WhatsApp Web, you should be able to start chatting straight away.

If you are not signed in yet, WhatsApp may first ask you to log in.

## Important note about phone numbers

This extension removes spaces, brackets, dashes, and other symbols from the number before opening WhatsApp.

For best results, the number should include the **country code**.

Example:

- Better: `15551234567`
- Less reliable: `5551234567`

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
- The country code is included
- The selected text is actually the phone number and not extra words or symbols

### The extension disappeared after restarting Chrome

Go back to:

`chrome://extensions`

If it is turned off, switch it back on.

If the project folder was moved or deleted, Chrome may need you to load it again using **Load unpacked**.

## Updating the extension after changes

If someone updates the files in this folder, you can refresh the extension like this:

1. Open `chrome://extensions`
2. Find **Tel to WhatsApp**
3. Click the refresh/reload icon on its card

## Removing the extension

1. Open `chrome://extensions`
2. Find **Tel to WhatsApp**
3. Click **Remove**

## Files in this project

- `manifest.json` tells Chrome basic information about the extension
- `background.js` handles the right-click menu and opens WhatsApp

If you only want to use the extension, you do not need to edit these files.

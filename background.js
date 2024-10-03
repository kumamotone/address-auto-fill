chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "autoFillAddress",
    title: "住所を自動入力",
    contexts: ["page", "selection", "link"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "autoFillAddress") {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { action: "autoFillAddress" });
    });
  }
});
async function getEncryptionKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get('encryptionKey', function(result) {
      resolve(result.encryptionKey);
    });
  });
}

async function decryptData(encryptedData) {
  const key = await getEncryptionKey();
  const bytes = CryptoJS.AES.decrypt(encryptedData, key);
  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
}

async function autoFillAddress(address) {
  const fieldMapping = {
    'form-postal': ['postal-code', 'zipcode', 'zip', 'postal'],
    'form-prefecture': ['address-level1', 'state', 'prefecture', 'pref'],
    'form-city': ['address-level2', 'city'],
    'form-address1': ['address-line1', 'street-address', 'address1'],
    'form-address2': ['address-line2', 'apartment', 'address2'],
    'family-name': ['family-name', 'lastname', 'last-name'],
    'given-name': ['given-name', 'firstname', 'first-name'],
    'tel': ['tel', 'telephone', 'phone', 'mobile'],
    'email': ['email', 'mail'],
    'bday-year': ['bday-year', 'birthyear'],
    'bday-month': ['bday-month', 'birthmonth'],
    'bday-day': ['bday-day', 'birthday']
  };

  for (const [key, possibleNames] of Object.entries(fieldMapping)) {
    const value = address[key];
    if (value) {
      for (const name of possibleNames) {
        const input = document.querySelector(`input[name="${name}"], input[id="${name}"], input[autocomplete="${name}"], select[name="${name}"], select[id="${name}"]`);
        if (input) {
          if (input.tagName.toLowerCase() === 'select') {
            // プルダウンメニューの場合
            const option = Array.from(input.options).find(opt => opt.text.includes(value) || opt.value.includes(value));
            if (option) {
              input.value = option.value;
            }
          } else {
            // 通常の入力フィールドの場合
            input.value = value;
          }
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          break;
        }
      }
    }
  }

  // 特別な処理: 都道府県と市区町村を結合
  const prefCity = document.querySelector('input[name="pref_city"]');
  if (prefCity) {
    prefCity.value = `${address['form-prefecture']} ${address['form-city']}`;
    prefCity.dispatchEvent(new Event('input', { bubbles: true }));
    prefCity.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // 特別な処理: 町名・番地と建物名を結合
  const street = document.querySelector('input[name="street"]');
  if (street) {
    street.value = `${address['form-address1']} ${address['form-address2'] || ''}`.trim();
    street.dispatchEvent(new Event('input', { bubbles: true }));
    street.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "autoFillAddress") {
    chrome.storage.sync.get(['encryptedAddress'], async function(data) {
      if (data.encryptedAddress) {
        try {
          const address = await decryptData(data.encryptedAddress);
          await autoFillAddress(address);
        } catch (error) {
          console.error('データの復号化に失敗しました:', error);
        }
      }
    });
  }
});
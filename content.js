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
    'form-postal': ['postal', 'zip', 'postcode', '郵便番号'],
    'form-prefecture': ['prefecture', 'pref', 'state', 'region', '都道府県'],
    'form-city': ['city', 'locality', 'address-level2', '市区町村'],
    'form-address1': ['address1', 'street', 'street-address', 'line1', '町名番地'],
    'form-address2': ['address2', 'extended-address', 'line2', '建物名'],
    'family-name': ['family', 'last', 'surname', '姓'],
    'given-name': ['given', 'first', 'name', '名'],
    'tel': ['tel', 'telephone', 'phone', 'mobile', '電話'],
    'email': ['email', 'mail', 'メール'],
    'bday-year': ['year', 'birthyear', '年'],
    'bday-month': ['month', 'birthmonth', '月'],
    'bday-day': ['day', 'birthday', '日']
  };

  const inputs = document.querySelectorAll('input, select');
  
  for (const input of inputs) {
    const inputId = input.id.toLowerCase();
    const inputName = input.name.toLowerCase();
    const inputAutocomplete = (input.getAttribute('autocomplete') || '').toLowerCase();

    for (const [key, possibleNames] of Object.entries(fieldMapping)) {
      if (possibleNames.some(name => 
          inputId.includes(name) || 
          inputName.includes(name) || 
          inputAutocomplete.includes(name)
      )) {
        const value = address[key];
        if (value) {
          if (input.tagName.toLowerCase() === 'select') {
            const option = Array.from(input.options).find(opt => 
              opt.text.toLowerCase().includes(value.toLowerCase()) || 
              opt.value.toLowerCase().includes(value.toLowerCase())
            );
            if (option) {
              input.value = option.value;
            }
          } else {
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
  const prefCity = document.querySelector('input[name*="pref_city"], input[id*="pref_city"]');
  if (prefCity) {
    prefCity.value = `${address['form-prefecture']} ${address['form-city']}`;
    prefCity.dispatchEvent(new Event('input', { bubbles: true }));
    prefCity.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // 特別な処理: 町名・番地と建物名を結合
  const street = document.querySelector('input[name*="street"], input[id*="street"]');
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
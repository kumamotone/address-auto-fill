let currentAddressId = null;

document.addEventListener('DOMContentLoaded', function() {
  loadAddress();
  document.getElementById('addressForm').addEventListener('submit', onFormSubmit);
});

function getEncryptionKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get('encryptionKey', function(result) {
      if (result.encryptionKey) {
        resolve(result.encryptionKey);
      } else {
        const newKey = CryptoJS.lib.WordArray.random(256 / 8).toString();
        chrome.storage.local.set({encryptionKey: newKey}, function() {
          resolve(newKey);
        });
      }
    });
  });
}

async function encryptData(data) {
  const key = await getEncryptionKey();
  return CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
}

async function decryptData(encryptedData) {
  const key = await getEncryptionKey();
  const bytes = CryptoJS.AES.decrypt(encryptedData, key);
  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
}

function loadAddress() {
  chrome.storage.sync.get(['encryptedAddress'], async function(data) {
    if (data.encryptedAddress) {
      try {
        const address = await decryptData(data.encryptedAddress);
        document.getElementById('form-postal').value = address['form-postal'] || '';
        document.getElementById('form-prefecture').value = address['form-prefecture'] || '';
        document.getElementById('form-city').value = address['form-city'] || '';
        document.getElementById('form-address1').value = address['form-address1'] || '';
        document.getElementById('form-address2').value = address['form-address2'] || '';
        document.getElementById('family-name').value = address['family-name'] || '';
        document.getElementById('given-name').value = address['given-name'] || '';
        document.getElementById('tel').value = address['tel'] || '';
        document.getElementById('email').value = address['email'] || '';
        document.getElementById('bday-year').value = address['bday-year'] || '';
        document.getElementById('bday-month').value = address['bday-month'] || '';
        document.getElementById('bday-day').value = address['bday-day'] || '';
      } catch (error) {
        console.error('データの復号化に失敗しました:', error);
        showMessage('データの読み込みに失敗しました', true);
      }
    }
  });
}

async function onFormSubmit(e) {
  e.preventDefault();
  const addressData = {
    'form-postal': document.getElementById('form-postal').value,
    'form-prefecture': document.getElementById('form-prefecture').value,
    'form-city': document.getElementById('form-city').value,
    'form-address1': document.getElementById('form-address1').value,
    'form-address2': document.getElementById('form-address2').value,
    'family-name': document.getElementById('family-name').value,
    'given-name': document.getElementById('given-name').value,
    'tel': document.getElementById('tel').value,
    'email': document.getElementById('email').value,
    'bday-year': document.getElementById('bday-year').value,
    'bday-month': document.getElementById('bday-month').value,
    'bday-day': document.getElementById('bday-day').value
  };
  
  try {
    const encryptedAddress = await encryptData(addressData);
    await new Promise((resolve) => chrome.storage.sync.set({encryptedAddress: encryptedAddress}, resolve));
    showMessage('住所情報が保存されました');
  } catch (error) {
    console.error('データの保存に失敗しました:', error);
    showMessage('住所情報の保存に失敗しました', true);
  }
}

function showMessage(message, isError = false) {
  const messageElement = document.getElementById('message');
  messageElement.textContent = message;
  messageElement.className = isError ? 'error' : '';
  setTimeout(() => {
    messageElement.textContent = '';
    messageElement.className = '';
  }, 3000);
}
const rooms = [
  ['🛋️','Wohnzimmer']
];
const styles = [
  ['Modern','Klare Linien, ruhige Farben und funktionale Möbel'],['Skandinavisch','Hell, natürlich, gemütlich und unkompliziert'],
  ['Japandi','Japanische Ruhe trifft skandinavische Wärme'],['Industrial','Rohes Holz, Metall und markante Kontraste'],
  ['Boho','Lebendig, persönlich, textil und pflanzenreich'],['Mid-Century','Organische Formen und Design der 1950er–60er'],
  ['1990er Revival','Warme Hölzer, Glas, Chrom und mutige Akzente'],['Landhaus','Zeitlos, wohnlich und von der Natur inspiriert'],
  ['Neubau minimalistisch','Raumoptimiert, hochwertig und reduziert']
];

const state = { step: 1, room: '', style: '', images: [], location: null };
const roomOptions = document.querySelector('#room-options');
const styleOptions = document.querySelector('#style-options');
const error = document.querySelector('#form-error');

function addChoices(container, choices, key) {
  choices.forEach(([first, second]) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'choice'; button.dataset.value = second;
    button.innerHTML = key === 'room' ? `<span class="icon">${first}</span><b>${second}</b>` : `<b>${first}</b><small>${second}</small>`;
    button.addEventListener('click', () => {
      container.querySelectorAll('.choice').forEach(el => el.classList.remove('selected'));
      button.classList.add('selected'); state[key] = key === 'room' ? second : first; error.textContent = '';
    });
    container.appendChild(button);
  });
}
addChoices(roomOptions, rooms, 'room'); addChoices(styleOptions, styles, 'style');

function renderStep() {
  document.querySelectorAll('.step').forEach(el => el.classList.toggle('active', Number(el.dataset.step) === state.step));
  document.querySelectorAll('.progress li').forEach((el, index) => el.classList.toggle('active', index < state.step));
  document.querySelector('#back-button').style.visibility = state.step === 1 ? 'hidden' : 'visible';
  document.querySelector('#next-button').textContent = state.step === 4 ? 'Konzept erstellen ✦' : 'Weiter →';
  error.textContent = '';
}
function validateStep() {
  if (state.step === 1 && !state.room) return 'Bitte wähle zuerst einen Raum aus.';
  if (state.step === 2 && !state.style) return 'Bitte wähle einen Designstil aus.';
  if (state.step === 3 && !state.images.length) return 'Bitte lade mindestens ein Foto deines Raumes hoch.';
  return '';
}
document.querySelector('#next-button').addEventListener('click', () => {
  const message = validateStep(); if (message) { error.textContent = message; return; }
  if (state.step < 4) { state.step += 1; renderStep(); return; }
  const budget = Number(document.querySelector('#budget').value).toLocaleString('de-DE');
  const country = document.querySelector('#country').value;
  document.querySelector('#result-summary').textContent = `${state.room} im Stil „${state.style}“, mit einem Budget von ${budget} € und verfügbaren Produkten für ${country}.`;
  document.querySelector('#planner-form').style.display = 'none'; document.querySelector('.progress').style.display = 'none'; document.querySelector('#result').classList.add('active');
});
document.querySelector('#back-button').addEventListener('click', () => { if (state.step > 1) { state.step -= 1; renderStep(); } });

const budget = document.querySelector('#budget');
function updateBudget() { document.querySelector('#budget-value').textContent = `${Number(budget.value).toLocaleString('de-DE')} €${budget.value === budget.max ? '+' : ''}`; }
budget.addEventListener('input', updateBudget);
document.querySelectorAll('[data-budget]').forEach(btn => btn.addEventListener('click', () => { budget.value = btn.dataset.budget; updateBudget(); }));

document.querySelector('#room-images').addEventListener('change', event => {
  const files = [...event.target.files].slice(0, 5);
  const tooLarge = files.find(file => file.size > 10 * 1024 * 1024);
  if (tooLarge) { error.textContent = `${tooLarge.name} ist größer als 10 MB.`; return; }
  state.images = files; const preview = document.querySelector('#preview-grid'); preview.innerHTML = '';
  files.forEach(file => { const img = document.createElement('img'); img.src = URL.createObjectURL(file); img.alt = `Vorschau von ${file.name}`; preview.appendChild(img); });
  error.textContent = '';
});
document.querySelector('#restart-button').addEventListener('click', () => location.reload());

const locationDialog = document.querySelector('#location-dialog');
const locationTrigger = document.querySelector('#location-trigger');
const locationLabel = document.querySelector('#location-label');
const locationStatus = document.querySelector('#location-status');
const postcodeEntry = document.querySelector('#postcode-entry');

function setLocationStatus(message, isError = false) {
  locationStatus.textContent = message;
  locationStatus.classList.toggle('error', isError);
}

locationTrigger.addEventListener('click', () => {
  setLocationStatus('');
  locationDialog.showModal();
});

document.querySelector('#show-postcode').addEventListener('click', () => {
  postcodeEntry.hidden = false;
  document.querySelector('#postcode').focus();
});

document.querySelector('#save-postcode').addEventListener('click', () => {
  const postcode = document.querySelector('#postcode').value.trim();
  if (!/^\d{5}$/.test(postcode)) {
    setLocationStatus('Bitte gib eine gültige fünfstellige Postleitzahl ein.', true);
    return;
  }
  state.location = { type: 'postcode', postcode };
  locationLabel.textContent = postcode;
  setLocationStatus(`Postleitzahl ${postcode} wurde für diese Sitzung übernommen.`);
});

document.querySelector('#detect-location').addEventListener('click', () => {
  if (!navigator.geolocation) {
    setLocationStatus('Dein Browser unterstützt die Standorterkennung nicht. Bitte gib deine Postleitzahl ein.', true);
    postcodeEntry.hidden = false;
    return;
  }
  setLocationStatus('Standort wird ermittelt …');
  navigator.geolocation.getCurrentPosition(position => {
    state.location = {
      type: 'coordinates',
      latitude: Number(position.coords.latitude.toFixed(2)),
      longitude: Number(position.coords.longitude.toFixed(2))
    };
    locationLabel.textContent = 'Standort erkannt';
    setLocationStatus('Dein ungefährer Standort wurde nur für diese Sitzung übernommen.');
  }, geolocationError => {
    const messages = {
      1: 'Standortfreigabe wurde abgelehnt. Du kannst stattdessen deine Postleitzahl eingeben.',
      2: 'Der Standort konnte nicht ermittelt werden. Bitte gib deine Postleitzahl ein.',
      3: 'Die Standortabfrage hat zu lange gedauert. Bitte versuche es erneut oder gib deine Postleitzahl ein.'
    };
    setLocationStatus(messages[geolocationError.code] || 'Der Standort konnte nicht ermittelt werden.', true);
    postcodeEntry.hidden = false;
  }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
});

renderStep(); updateBudget();

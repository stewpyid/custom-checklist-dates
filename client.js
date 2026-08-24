// 1. Initialize the Power-Up unconditionally so Trello can discover it
const t = TrelloPowerUp.initialize({
  'card-back-section': function(t, options) {
    return {
      title: 'Checklist Date Ranges',
      icon: 'https://hyperdev.com',
      content: {
        type: 'iframe',
        url: t.signUrl('./index.html'),
        height: 200
      }
    };
  }
});

// 2. Isolated function to run only when inside the iframe view
async function renderIframe() {
  const container = document.getElementById('checklist-container');
  if (!container) return; // Guard against execution on the main card frame

  try {
    const card = await t.card('checklists');
    const savedDates = await t.get('card', 'shared', 'custom-checklist-dates', {});

    if (!card.checklists || card.checklists.length === 0) {
      container.innerHTML = '<p style="color: #6b778c; font-style: italic; padding: 10px;">No checklist items found on this card.</p>';
      t.sizeTo('#checklist-container');
      return;
    }

    container.innerHTML = ''; // Clear out the loading message

    card.checklists.forEach(list => {
      list.checkitems.forEach(item => {
        const itemDates = savedDates[item.id] || { start: '', end: '' };
        const row = document.createElement('div');
        row.className = 'task-row';
        row.innerHTML = `
          <div class="task-name">${item.name}</div>
          <div class="date-inputs">
            <label>Start:</label>
            <input type="date" class="start-date" data-id="${item.id}" value="${itemDates.start}">
            <label>End:</label>
            <input type="date" class="end-date" data-id="${item.id}" value="${itemDates.end}">
          </div>
        `;
        container.appendChild(row);
      });
    });

    // Save configuration updates
    container.querySelectorAll('input[type="date"]').forEach(input => {
      input.addEventListener('change', async (e) => {
        const itemId = e.target.getAttribute('data-id');
        const isStart = e.target.classList.contains('start-date');
        const currentData = await t.get('card', 'shared', 'custom-checklist-dates', {});
        
        if (!currentData[itemId]) currentData[itemId] = { start: '', end: '' };
        if (isStart) currentData[itemId].start = e.target.value;
        else currentData[itemId].end = e.target.value;

        await t.set('card', 'shared', 'custom-checklist-dates', currentData);
      });
    });

    t.sizeTo('#checklist-container');
  } catch (err) {
    container.innerHTML = '<p style="color: red;">Error loading data.</p>';
  }
}

// Check if we are inside the index.html page context and run render
if (window.location.pathname.endsWith('index.html')) {
  t.render(function() {
    renderIframe();
  });
}

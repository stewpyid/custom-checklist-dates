const t = TrelloPowerUp.initialize({
  'card-back-section': function(t, options) {
    return {
      title: 'Checklist Date Ranges',
      icon: 'https://hyperdev.com',
      content: {
        type: 'iframe',
        url: t.signUrl('./index.html'),
        height: 200 // Will scale automatically
      }
    };
  }
});

// Code to run inside the iframe box
if (window.location.pathname.endsWith('index.html')) {
  const tIframe = TrelloPowerUp.iframe();

  tIframe.render(async function() {
    const container = document.getElementById('checklist-container');
    
    // 1. Get the current card data and checklists
    const card = await tIframe.card('checklists');
    // 2. Fetch saved custom date ranges from Trello storage
    const savedDates = await tIframe.get('card', 'shared', 'custom-checklist-dates', {});

    if (!card.checklists || card.checklists.length === 0) {
      container.innerHTML = '<p style="color: #6b778c; font-style: italic;">No checklist items found on this card.</p>';
      tIframe.sizeTo('#checklist-container');
      return;
    }

    container.innerHTML = ''; // Clear loader

    // Loop through all checklists and individual items
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

    // Handle saving dates when changed
    container.querySelectorAll('input[type="date"]').forEach(input => {
      input.addEventListener('change', async (e) => {
        const itemId = e.target.getAttribute('data-id');
        const isStart = e.target.classList.contains('start-date');
        
        // Grab current dictionary state
        const currentData = await tIframe.get('card', 'shared', 'custom-checklist-dates', {});
        if (!currentData[itemId]) currentData[itemId] = { start: '', end: '' };

        // Update the specific value changed
        if (isStart) currentData[itemId].start = e.target.value;
        else currentData[itemId].end = e.target.value;

        // Save data directly into Trello's backend for free
        await tIframe.set('card', 'shared', 'custom-checklist-dates', currentData);
      });
    });

    // Resize the box height dynamically to perfectly fit the number of items
    tIframe.sizeTo('#checklist-container');
  });
}

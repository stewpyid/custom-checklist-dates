const t = TrelloPowerUp.iframe();

const STORAGE_KEY = 'custom-checklist-dates';

async function loadChecklistDates() {

    const container = document.getElementById('checklist-container');

    try {

        /*
         * Get the checklists and checklist items
         * from the current Trello card.
         */
        const card = await t.card('checklists');

        /*
         * Get our custom date data.
         *
         * This is stored separately from Trello's
         * native checklist data.
         */
        const savedDates = await t.get(
            'card',
            'shared',
            STORAGE_KEY,
            {}
        );

        container.innerHTML = '';

        /*
         * No checklists
         */
        if (!card.checklists || card.checklists.length === 0) {

            container.innerHTML = `
                <div class="empty-message">
                    This card has no checklists.
                </div>
            `;

            await t.sizeTo('#checklist-container');

            return;
        }

        /*
         * Build the UI.
         */
        card.checklists.forEach(checklist => {

            const section = document.createElement('div');

            section.className = 'checklist-section';

            const title = document.createElement('div');

            title.className = 'checklist-title';

            title.textContent = checklist.name;

            section.appendChild(title);

            /*
             * No items in this checklist
             */
            if (
                !checklist.checkItems ||
                checklist.checkItems.length === 0
            ) {

                const empty = document.createElement('div');

                empty.className = 'empty-message';

                empty.textContent = 'No items in this checklist.';

                section.appendChild(empty);

                container.appendChild(section);

                return;
            }

            /*
             * Create a row for every checklist item.
             */
            checklist.checkItems.forEach(item => {

                const itemId = item.id;

                const dates = savedDates[itemId] || {
                    start: '',
                    end: ''
                };

                const row = document.createElement('div');

                row.className = 'task-row';

                /*
                 * Item name
                 */
                const name = document.createElement('div');

                name.className = 'task-name';

                name.textContent = item.name;

                /*
                 * Date controls
                 */
                const dateInputs = document.createElement('div');

                dateInputs.className = 'date-inputs';

                /*
                 * START
                 */
                const startLabel = document.createElement('span');

                startLabel.className = 'date-label';

                startLabel.textContent = 'Start';

                const startInput = document.createElement('input');

                startInput.type = 'date';

                startInput.className = 'date-input';

                startInput.value = dates.start || '';

                /*
                 * END
                 */
                const endLabel = document.createElement('span');

                endLabel.className = 'date-label';

                endLabel.textContent = 'End';

                const endInput = document.createElement('input');

                endInput.type = 'date';

                endInput.className = 'date-input';

                endInput.value = dates.end || '';

                /*
                 * Add everything to the row.
                 */
                dateInputs.appendChild(startLabel);
                dateInputs.appendChild(startInput);

                dateInputs.appendChild(endLabel);
                dateInputs.appendChild(endInput);

                row.appendChild(name);
                row.appendChild(dateInputs);

                section.appendChild(row);

                /*
                 * Save START date
                 */
                startInput.addEventListener('change', async () => {

                    await saveDate(
                        itemId,
                        'start',
                        startInput.value
                    );

                });

                /*
                 * Save END date
                 */
                endInput.addEventListener('change', async () => {

                    await saveDate(
                        itemId,
                        'end',
                        endInput.value
                    );

                });

            });

            container.appendChild(section);

        });

        /*
         * Resize the Trello iframe.
         */
        await t.sizeTo('#checklist-container');

    } catch (error) {

        console.error(
            'Checklist Date Power-Up Error:',
            error
        );

        container.innerHTML = `
            <div class="empty-message">
                Failed to load checklist data.
                Check the browser console for details.
            </div>
        `;

        await t.sizeTo('#checklist-container');
    }
}


/*
 * Save a date for a specific checklist item.
 */
async function saveDate(itemId, type, value) {

    try {

        const currentData = await t.get(
            'card',
            'shared',
            STORAGE_KEY,
            {}
        );

        /*
         * Create the entry if it doesn't exist.
         */
        if (!currentData[itemId]) {

            currentData[itemId] = {
                start: '',
                end: ''
            };

        }

        /*
         * Update either start or end.
         */
        currentData[itemId][type] = value;

        /*
         * Save it back to the card.
         */
        await t.set(
            'card',
            'shared',
            STORAGE_KEY,
            currentData
        );

        /*
         * Tell Trello the iframe may have changed size.
         */
        await t.sizeTo('#checklist-container');

        console.log(
            'Saved checklist date:',
            itemId,
            type,
            value
        );

    } catch (error) {

        console.error(
            'Failed to save checklist date:',
            error
        );

    }
}


/*
 * Start the Power-Up iframe.
 */
t.render(function () {

    loadChecklistDates();

});

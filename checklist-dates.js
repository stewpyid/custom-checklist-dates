const t = TrelloPowerUp.iframe({
    appKey: '366dbe929f3398a21e20a250d3fa4c17',
    appName: 'Checklist Date Ranges'
});

const STORAGE_KEY = 'custom-checklist-dates';


t.render(async function () {

    const container =
        document.getElementById('checklist-container');

    try {

        /*
         * Get the card's checklists.
         */
        const card = await t.card(
            'id',
            'checklists'
        );

        console.log(
            '[Checklist Dates] Card:',
            card
        );


        /*
         * Get our previously saved dates.
         */
        const savedDates = await t.get(
            'card',
            'shared',
            STORAGE_KEY,
            {}
        );


        /*
         * Make sure we actually have checklists.
         */
        if (
            !card.checklists ||
            card.checklists.length === 0
        ) {

            container.innerHTML = `
                <div class="empty-message">
                    This card has no checklists.
                </div>
            `;

            await t.sizeTo('#checklist-container');

            return;
        }


        /*
         * Get the REST API client.
         */
        const restApi = await t.getRestApi();


        /*
         * Clear the loading message.
         */
        container.innerHTML = '';


        /*
         * Process every checklist.
         */
        for (const checklist of card.checklists) {

            const section =
                document.createElement('div');

            section.className =
                'checklist-section';


            /*
             * Checklist name.
             */
            const title =
                document.createElement('div');

            title.className =
                'checklist-title';

            title.textContent =
                checklist.name;

            section.appendChild(title);


            /*
             * Ask Trello REST API for the
             * actual checklist items.
             */
            const response =
                await restApi.get(
                    `/checklists/${checklist.id}/checkItems`
                );


            const items =
                response || [];


            console.log(
                '[Checklist Dates] Items for',
                checklist.name,
                items
            );


            /*
             * No items.
             */
            if (items.length === 0) {

                const empty =
                    document.createElement('div');

                empty.className =
                    'empty-message';

                empty.textContent =
                    'No items in this checklist.';

                section.appendChild(empty);

            }


            /*
             * Create UI for every item.
             */
            for (const item of items) {

                const itemId =
                    item.id;


                /*
                 * Get previously saved dates.
                 */
                const dates =
                    savedDates[itemId] || {
                        start: '',
                        end: ''
                    };


                /*
                 * Main row.
                 */
                const row =
                    document.createElement('div');

                row.className =
                    'task-row';


                /*
                 * Item name.
                 */
                const name =
                    document.createElement('div');

                name.className =
                    'task-name';

                name.textContent =
                    item.name;


                /*
                 * Date controls.
                 */
                const dateInputs =
                    document.createElement('div');

                dateInputs.className =
                    'date-inputs';


                /*
                 * START LABEL
                 */
                const startLabel =
                    document.createElement('span');

                startLabel.className =
                    'date-label';

                startLabel.textContent =
                    'Start';


                /*
                 * START INPUT
                 */
                const startInput =
                    document.createElement('input');

                startInput.type =
                    'date';

                startInput.className =
                    'date-input';

                startInput.value =
                    dates.start || '';


                /*
                 * END LABEL
                 */
                const endLabel =
                    document.createElement('span');

                endLabel.className =
                    'date-label';

                endLabel.textContent =
                    'End';


                /*
                 * END INPUT
                 */
                const endInput =
                    document.createElement('input');

                endInput.type =
                    'date';

                endInput.className =
                    'date-input';

                endInput.value =
                    dates.end || '';


                /*
                 * Build date controls.
                 */
                dateInputs.appendChild(
                    startLabel
                );

                dateInputs.appendChild(
                    startInput
                );

                dateInputs.appendChild(
                    endLabel
                );

                dateInputs.appendChild(
                    endInput
                );


                /*
                 * Build row.
                 */
                row.appendChild(name);

                row.appendChild(dateInputs);

                section.appendChild(row);


                /*
                 * Save START date.
                 */
                startInput.addEventListener(
                    'change',
                    async function () {

                        await saveDate(
                            itemId,
                            'start',
                            startInput.value
                        );

                    }
                );


                /*
                 * Save END date.
                 */
                endInput.addEventListener(
                    'change',
                    async function () {

                        await saveDate(
                            itemId,
                            'end',
                            endInput.value
                        );

                    }
                );

            }


            /*
             * Add checklist to page.
             */
            container.appendChild(section);

        }


        /*
         * Resize iframe.
         */
        await t.sizeTo(
            '#checklist-container'
        );

    }

    catch (error) {

        console.error(
            '[Checklist Dates] ERROR:',
            error
        );


        container.innerHTML = `
            <div
                style="
                    padding: 10px;
                    font-family: sans-serif;
                    color: #c9372c;
                "
            >

                <strong>
                    Power-Up Error
                </strong>

                <br><br>

                ${escapeHtml(
                    error?.message ||
                    String(error)
                )}

            </div>
        `;


        await t.sizeTo(
            '#checklist-container'
        );

    }

});


/*
 * Save one date.
 */
async function saveDate(
    itemId,
    type,
    value
) {

    try {

        const currentData =
            await t.get(
                'card',
                'shared',
                STORAGE_KEY,
                {}
            );


        /*
         * Create item entry if necessary.
         */
        if (!currentData[itemId]) {

            currentData[itemId] = {
                start: '',
                end: ''
            };

        }


        /*
         * Update date.
         */
        currentData[itemId][type] =
            value;


        /*
         * Save to card.
         */
        await t.set(
            'card',
            'shared',
            STORAGE_KEY,
            currentData
        );


        console.log(
            '[Checklist Dates] Saved:',
            itemId,
            type,
            value
        );

    }

    catch (error) {

        console.error(
            '[Checklist Dates] Save failed:',
            error
        );

    }

}


/*
 * Prevent HTML injection when displaying
 * an error message.
 */
function escapeHtml(value) {

    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');

}

const APP_KEY = '366dbe929f3398a21e20a250d3fa4c17';
const APP_NAME = 'Checklist Date Ranges';

const STORAGE_KEY = 'custom-checklist-dates';


/*
 * Initialize the Trello iframe helper.
 *
 * appKey + appName are required for
 * the REST API client.
 */
const t = TrelloPowerUp.iframe({

    appKey: APP_KEY,

    appName: APP_NAME
});


/*
 * Get the current card.
 *
 * NOTE: t.card('id', 'checklists') does NOT
 * reliably populate real checkItems (confirmed
 * via testing - it can come back as an empty
 * array even when the checklist has real items).
 * We always fetch items via the real REST API
 * below instead of trusting this field.
 */


/*
 * Fetch checkItems via Trello's real REST API.
 *
 * IMPORTANT: t.getRestApi() is only a TOKEN
 * MANAGER (isAuthorized/authorize/getToken/
 * clearToken) - it has no generic .get() method.
 * You have to take the token it gives you and
 * make the actual HTTP request yourself against
 * api.trello.com.
 */
async function fetchCheckItemsViaRestApi(
    token,
    checklistId
) {

    const url =
        `https://api.trello.com/1/checklists/${checklistId}/checkItems` +
        `?key=${APP_KEY}&token=${token}`;

    const response =
        await fetch(url);


    if (!response.ok) {

        console.error(
            '[Checklist Dates] REST call failed:',
            response.status,
            response.statusText
        );

        return [];
    }


    const data =
        await response.json();


    /*
     * IMPORTANT: log the raw response.
     *
     * If this is ever empty when it shouldn't be,
     * this line tells you exactly what Trello
     * actually returned instead of silently
     * collapsing to [].
     */
    console.log(
        '[Checklist Dates] Raw REST response for',
        checklistId,
        ':',
        data
    );


    return Array.isArray(data)
        ? data
        : [];
}


/*
 * Start the iframe.
 */
t.render(async function () {

    const container =
        document.getElementById(
            'checklist-container'
        );


    try {

        /*
         * Get the current card.
         *
         * 'checklists' gives us the checklist
         * objects and their IDs. Trello's restricted
         * data model MAY already include checkItems
         * here - we check for that below before
         * falling back to a REST call.
         */
        const card =
            await t.card(
                'id',
                'checklists'
            );


        console.log(
            '[Checklist Dates] Card:',
            card
        );


        /*
         * Get our previously saved
         * Start / End date data.
         */
        const savedDates =
            await t.get(
                'card',
                'shared',
                STORAGE_KEY,
                {}
            );


        /*
         * No checklists.
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

            await t.sizeTo(
                '#checklist-container'
            );

            return;
        }


        /*
         * Only fetch a token once, on the first
         * checklist that needs it.
         */
        let apiToken = null;
        let triedAuth = false;


        /*
         * Clear loading message.
         */
        container.innerHTML = '';


        /*
         * Process every checklist.
         */
        for (
            const checklist
            of card.checklists
        ) {


            /*
             * Create checklist section.
             */
            const section =
                document.createElement('div');

            section.className =
                'checklist-section';


            /*
             * Checklist title.
             */
            const title =
                document.createElement('div');

            title.className =
                'checklist-title';

            title.textContent =
                checklist.name;

            section.appendChild(title);


            /*
             * Always fetch checkItems via Trello's
             * real REST API - t.card('checklists')
             * doesn't reliably include them, and
             * t.getRestApi() itself is only a token
             * manager (isAuthorized/authorize/
             * getToken/clearToken) - the actual HTTP
             * call has to be made with plain fetch().
             */
            if (!triedAuth) {

                triedAuth = true;

                const restApi =
                    await t.getRestApi();


                const authorized =
                    await restApi.isAuthorized();

                if (!authorized) {

                    section.innerHTML += `
                        <div class="error-message">

                            <strong>
                                Authorization required
                            </strong>

                            <br><br>

                            Open the Power-Up settings
                            and choose
                            <strong>
                                Authorize Account
                            </strong>
                            to load checklist items.

                        </div>
                    `;

                    container.appendChild(
                        section
                    );

                    continue;
                }


                apiToken =
                    await restApi.getToken();
            }

            const items =
                await fetchCheckItemsViaRestApi(
                    apiToken,
                    checklist.id
                );


            console.log(
                '[Checklist Dates] Checklist:',
                checklist.name
            );

            console.log(
                '[Checklist Dates] Items:',
                items
            );


            /*
             * Checklist has no items.
             */
            if (items.length === 0) {

                const empty =
                    document.createElement('div');

                empty.className =
                    'empty-message';

                empty.textContent =
                    'No items in this checklist.';

                section.appendChild(
                    empty
                );

            }


            /*
             * Create UI for every
             * checklist item.
             */
            for (
                const item
                of items
            ) {

                const itemId =
                    item.id;


                /*
                 * Load saved dates.
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
                    document.createElement(
                        'div'
                    );

                row.className =
                    'task-row';


                /*
                 * Item name.
                 */
                const name =
                    document.createElement(
                        'div'
                    );

                name.className =
                    'task-name';

                name.textContent =
                    item.name;


                /*
                 * Date controls.
                 */
                const dateInputs =
                    document.createElement(
                        'div'
                    );

                dateInputs.className =
                    'date-inputs';


                /*
                 * START label.
                 */
                const startLabel =
                    document.createElement(
                        'span'
                    );

                startLabel.className =
                    'date-label';

                startLabel.textContent =
                    'Start';


                /*
                 * START input.
                 */
                const startInput =
                    document.createElement(
                        'input'
                    );

                startInput.type =
                    'date';

                startInput.className =
                    'date-input';

                startInput.value =
                    dates.start || '';


                /*
                 * END label.
                 */
                const endLabel =
                    document.createElement(
                        'span'
                    );

                endLabel.className =
                    'date-label';

                endLabel.textContent =
                    'End';


                /*
                 * END input.
                 */
                const endInput =
                    document.createElement(
                        'input'
                    );

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

                row.appendChild(
                    dateInputs
                );


                /*
                 * Add row to checklist.
                 */
                section.appendChild(
                    row
                );


                /*
                 * Save Start date.
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
                 * Save End date.
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
             * Add checklist section
             * to the page.
             */
            container.appendChild(
                section
            );

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

            <div class="error-message">

                <strong>
                    Power-Up Error
                </strong>

                <br><br>

                ${escapeHtml(
                    error &&
                    error.message
                        ? error.message
                        : String(error)
                )}

            </div>

        `;


        await t.sizeTo(
            '#checklist-container'
        );

    }

});


/*
 * Save a Start or End date.
 */
async function saveDate(
    itemId,
    type,
    value
) {

    try {

        /*
         * Get existing Power-Up data.
         */
        const currentData =
            await t.get(
                'card',
                'shared',
                STORAGE_KEY,
                {}
            );


        /*
         * Create entry if necessary.
         */
        if (
            !currentData[itemId]
        ) {

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
         * Save it to the card.
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
            '[Checklist Dates] Save error:',
            error
        );

    }

}


/*
 * Prevent HTML from being interpreted
 * when displaying errors.
 */
function escapeHtml(value) {

    return String(value)

        .replaceAll(
            '&',
            '&amp;'
        )

        .replaceAll(
            '<',
            '&lt;'
        )

        .replaceAll(
            '>',
            '&gt;'
        )

        .replaceAll(
            '"',
            '&quot;'
        )

        .replaceAll(
            "'",
            '&#039;'
        );

}

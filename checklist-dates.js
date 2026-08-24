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
 * CONFIRMED VIA TESTING: t.card('id', 'checklists')
 * does NOT reliably populate real checkItems - it can
 * come back as an empty array even when the checklist
 * has items. So we always go through the REST API
 * below rather than trusting this field.
 */


/*
 * Fallback: fetch checkItems via the REST API.
 *
 * NOTE: Trello's REST endpoints are versioned
 * under /1/, so the path must include it or the
 * request will not hit the resource you expect.
 */
async function fetchCheckItemsViaRestApi(
    restApi,
    checklistId
) {

    const response =
        await restApi.get(
            `/1/checklists/${checklistId}/checkItems`
        );


    /*
     * IMPORTANT: log the raw response.
     *
     * If this is ever empty when it shouldn't be,
     * this line tells you exactly what Trello
     * actually returned (error object, wrong shape,
     * auth issue, etc.) instead of silently
     * collapsing to [].
     */
    console.log(
        '[Checklist Dates] Raw restApi response for',
        checklistId,
        ':',
        response
    );


    return Array.isArray(response)
        ? response
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
         * Only fetch the REST API client if we
         * actually end up needing it below.
         * (Lazily assigned in the loop.)
         */
        let restApi = null;


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
             * Always fetch checkItems via the REST
             * API - t.card('checklists') doesn't
             * reliably include them (confirmed via
             * console testing: it came back as an
             * empty array even for checklists with
             * real items).
             */
            if (!restApi) {

                restApi =
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
            }

            const items =
                await fetchCheckItemsViaRestApi(
                    restApi,
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

const APP_KEY = '366dbe929f3398a21e20a250d3fa4c17';
const APP_NAME = 'Checklist Date Ranges';

const STORAGE_KEY = 'custom-checklist-dates';


/*
 * IMPORTANT: date data is stored at BOARD scope,
 * not CARD scope, even though it's per-card data.
 *
 * Per Trello's own docs: "card-back-section iframes
 * are reloaded whenever pluginData is changed on the
 * card via t.set()." Since every date edit would call
 * t.set(), storing at card scope means every single
 * date change forces Trello to fully reload this
 * iframe (the visible "refresh" on every edit).
 * Board-scope pluginData changes don't trigger that
 * per-card reload, so we namespace the key with the
 * card id instead to keep each card's dates separate.
 */
function getDateStorageKey(cardId) {

    return `${STORAGE_KEY}:${cardId}`;
}


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
 * Detect Trello's board theme (light/dark).
 *
 * Trello encodes context - including the board's
 * theme - directly in this iframe's URL fragment
 * as JSON, e.g. ...#{"context":{"theme":null,
 * "initialTheme":"dark",...}}. There's no separate
 * SDK call needed - just read it from the URL.
 */
function detectTrelloTheme() {

    try {

        const hash =
            decodeURIComponent(
                window.location.hash.slice(1)
            );

        const parsed =
            JSON.parse(hash);

        const context =
            parsed.context || {};

        return (
            context.theme ||
            context.initialTheme ||
            'light'
        );

    }

    catch (error) {

        return 'light';
    }
}


/*
 * Apply the theme class to <body> so the CSS
 * variables in checklist-dates.html switch over.
 */
document.body.classList.add(
    'theme-' + detectTrelloTheme()
);


/*
 * ---------------------------------------------
 * Popup calendar date picker
 * ---------------------------------------------
 * Replaces the plain native <input type="date">
 * with a small custom month-view popup so it can
 * actually match Trello's dark/light theme, similar
 * in spirit to Trello's own "Dates" picker.
 *
 * Dates are still stored as plain 'YYYY-MM-DD'
 * strings, same as before, so existing saved data
 * keeps working with no migration needed.
 */

const WEEKDAY_LABELS =
    ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const MONTH_LABELS = [
    'January', 'February', 'March', 'April',
    'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December'
];


/*
 * Only one calendar popup should be open
 * at a time.
 */
let openPopupCleanup = null;

function closeOpenPopup() {

    if (openPopupCleanup) {

        openPopupCleanup();

        openPopupCleanup = null;

        /*
         * Shrink the iframe back down now that
         * the popup is gone.
         */
        t.sizeTo('#checklist-container');
    }
}

document.addEventListener(
    'click',
    closeOpenPopup
);


function parseIsoDate(isoString) {

    if (!isoString) {

        return null;
    }

    const parts =
        isoString.split('-');

    if (parts.length !== 3) {

        return null;
    }

    return new Date(
        Number(parts[0]),
        Number(parts[1]) - 1,
        Number(parts[2])
    );
}

function toIsoDate(date) {

    const year =
        date.getFullYear();

    const month =
        String(date.getMonth() + 1)
            .padStart(2, '0');

    const day =
        String(date.getDate())
            .padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function formatDisplayDate(isoString) {

    const date =
        parseIsoDate(isoString);

    if (!date) {

        return '';
    }

    return (
        MONTH_LABELS[date.getMonth()].slice(0, 3) +
        ' ' +
        date.getDate() +
        ', ' +
        date.getFullYear()
    );
}


/*
 * Builds the calendar popup for a given month,
 * with the currently selected date (if any)
 * highlighted, and wires up navigation and
 * day selection.
 */
function buildCalendarPopup(
    selectedIso,
    visibleYear,
    visibleMonth,
    onSelect,
    onNavigate
) {

    const popup =
        document.createElement('div');

    popup.className = 'calendar-popup';

    popup.addEventListener(
        'click',
        function (e) {

            e.stopPropagation();
        }
    );


    const header =
        document.createElement('div');

    header.className = 'calendar-header';

    const prevButton =
        document.createElement('button');

    prevButton.type = 'button';

    prevButton.className = 'calendar-nav-button';

    prevButton.textContent = '<';

    prevButton.addEventListener(
        'click',
        function () {

            onNavigate(-1);
        }
    );

    const monthLabel =
        document.createElement('div');

    monthLabel.className = 'calendar-month-label';

    monthLabel.textContent =
        MONTH_LABELS[visibleMonth] +
        ' ' +
        visibleYear;

    const nextButton =
        document.createElement('button');

    nextButton.type = 'button';

    nextButton.className = 'calendar-nav-button';

    nextButton.textContent = '>';

    nextButton.addEventListener(
        'click',
        function () {

            onNavigate(1);
        }
    );

    header.appendChild(prevButton);

    header.appendChild(monthLabel);

    header.appendChild(nextButton);

    popup.appendChild(header);


    const grid =
        document.createElement('div');

    grid.className = 'calendar-grid';

    for (
        const label
        of WEEKDAY_LABELS
    ) {

        const weekdayEl =
            document.createElement('div');

        weekdayEl.className = 'calendar-weekday';

        weekdayEl.textContent = label;

        grid.appendChild(weekdayEl);
    }


    const firstOfMonth =
        new Date(
            visibleYear,
            visibleMonth,
            1
        );

    const startOffset =
        firstOfMonth.getDay();

    const daysInMonth =
        new Date(
            visibleYear,
            visibleMonth + 1,
            0
        ).getDate();

    const daysInPrevMonth =
        new Date(
            visibleYear,
            visibleMonth,
            0
        ).getDate();

    const today =
        new Date();

    const todayIso =
        toIsoDate(today);


    const totalCells = 42;

    for (
        let cellIndex = 0;
        cellIndex < totalCells;
        cellIndex++
    ) {

        const dayNumber =
            cellIndex - startOffset + 1;

        let cellDate;

        let outsideMonth = false;

        if (dayNumber < 1) {

            cellDate =
                new Date(
                    visibleYear,
                    visibleMonth - 1,
                    daysInPrevMonth + dayNumber
                );

            outsideMonth = true;

        } else if (dayNumber > daysInMonth) {

            cellDate =
                new Date(
                    visibleYear,
                    visibleMonth + 1,
                    dayNumber - daysInMonth
                );

            outsideMonth = true;

        } else {

            cellDate =
                new Date(
                    visibleYear,
                    visibleMonth,
                    dayNumber
                );
        }

        const cellIso =
            toIsoDate(cellDate);

        const dayButton =
            document.createElement('button');

        dayButton.type = 'button';

        dayButton.className =
            'calendar-day' +
            (outsideMonth ? ' is-outside-month' : '') +
            (cellIso === todayIso ? ' is-today' : '') +
            (cellIso === selectedIso ? ' is-selected' : '');

        dayButton.textContent =
            String(cellDate.getDate());

        dayButton.addEventListener(
            'click',
            function () {

                onSelect(cellIso);
            }
        );

        grid.appendChild(dayButton);
    }

    popup.appendChild(grid);


    const footer =
        document.createElement('div');

    footer.className = 'calendar-footer';

    const clearButton =
        document.createElement('button');

    clearButton.type = 'button';

    clearButton.className = 'calendar-clear-button';

    clearButton.textContent = 'Clear date';

    clearButton.addEventListener(
        'click',
        function () {

            onSelect('');
        }
    );

    footer.appendChild(clearButton);

    popup.appendChild(footer);


    return popup;
}


/*
 * Creates a date picker: a small trigger button
 * that opens a popup calendar anchored to it.
 * `onChange` is called with the new ISO date
 * string (or '' if cleared).
 */
function createDatePicker(initialIsoDate, onChange) {

    const wrapper =
        document.createElement('div');

    wrapper.className = 'date-field';

    const trigger =
        document.createElement('button');

    trigger.type = 'button';

    let currentIso = initialIsoDate || '';

    function refreshTriggerLabel() {

        if (currentIso) {

            trigger.textContent =
                formatDisplayDate(currentIso);

            trigger.className =
                'date-picker-trigger';

        } else {

            trigger.textContent = 'Set date';

            trigger.className =
                'date-picker-trigger is-empty';
        }
    }

    refreshTriggerLabel();


    trigger.addEventListener(
        'click',
        function (e) {

            e.stopPropagation();

            closeOpenPopup();


            const baseDate =
                parseIsoDate(currentIso) ||
                new Date();

            let visibleYear =
                baseDate.getFullYear();

            let visibleMonth =
                baseDate.getMonth();


            function render() {

                const existingPopup =
                    wrapper.querySelector(
                        '.calendar-popup'
                    );

                if (existingPopup) {

                    existingPopup.remove();
                }

                const popup =
                    buildCalendarPopup(
                        currentIso,
                        visibleYear,
                        visibleMonth,
                        function (newIso) {

                            currentIso = newIso;

                            refreshTriggerLabel();

                            onChange(newIso);

                            closeOpenPopup();
                        },
                        function (direction) {

                            visibleMonth += direction;

                            if (visibleMonth < 0) {

                                visibleMonth = 11;

                                visibleYear -= 1;

                            } else if (visibleMonth > 11) {

                                visibleMonth = 0;

                                visibleYear += 1;
                            }

                            render();
                        }
                    );

                wrapper.appendChild(popup);

                /*
                 * Flip the popup above the trigger
                 * if there isn't enough room below
                 * it in the visible iframe area -
                 * resizing the iframe alone doesn't
                 * help when the trigger is near the
                 * bottom of a long checklist, since
                 * the popup would render below what's
                 * actually visible on screen.
                 */
                const triggerRect =
                    trigger.getBoundingClientRect();

                const popupHeight =
                    popup.offsetHeight;

                const spaceBelow =
                    window.innerHeight -
                    triggerRect.bottom;

                if (
                    spaceBelow < popupHeight + 8 &&
                    triggerRect.top > popupHeight + 8
                ) {

                    popup.classList.add(
                        'flip-up'
                    );

                } else {

                    popup.classList.remove(
                        'flip-up'
                    );
                }

                /*
                 * Grow the iframe so the popup
                 * isn't clipped by the fixed
                 * card-back-section height.
                 */
                t.sizeTo(
                    '#checklist-container'
                );
            }

            render();


            openPopupCleanup = function () {

                const existingPopup =
                    wrapper.querySelector(
                        '.calendar-popup'
                    );

                if (existingPopup) {

                    existingPopup.remove();
                }
            };
        }
    );

    wrapper.appendChild(trigger);

    return wrapper;
}


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
         *
         * Board scope, not card scope - see the
         * comment on getDateStorageKey() for why.
         */
        const savedDates =
            await t.get(
                'board',
                'shared',
                getDateStorageKey(card.id),
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
                 * Item name. Trello's REST API
                 * gives us item.state as 'complete'
                 * or 'incomplete' - reflect that
                 * with a strikethrough so completed
                 * items are visible at a glance here
                 * too.
                 */
                const isComplete =
                    item.state === 'complete';

                const name =
                    document.createElement(
                        'div'
                    );

                name.className =
                    'task-name' +
                    (isComplete ? ' is-complete' : '');

                name.textContent =
                    item.name;

                if (isComplete) {

                    row.classList.add(
                        'is-complete'
                    );
                }


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
                 * START field.
                 */
                const startField =
                    document.createElement(
                        'div'
                    );

                startField.className =
                    'date-field';

                const startLabel =
                    document.createElement(
                        'span'
                    );

                startLabel.className =
                    'date-label';

                startLabel.textContent =
                    'Start';

                const startPicker =
                    createDatePicker(
                        dates.start,
                        async function (newValue) {

                            await saveDate(
                                card.id,
                                itemId,
                                'start',
                                newValue
                            );
                        }
                    );

                startField.appendChild(
                    startLabel
                );

                startField.appendChild(
                    startPicker
                );


                /*
                 * END field.
                 */
                const endField =
                    document.createElement(
                        'div'
                    );

                endField.className =
                    'date-field';

                const endLabel =
                    document.createElement(
                        'span'
                    );

                endLabel.className =
                    'date-label';

                endLabel.textContent =
                    'End';

                const endPicker =
                    createDatePicker(
                        dates.end,
                        async function (newValue) {

                            await saveDate(
                                card.id,
                                itemId,
                                'end',
                                newValue
                            );
                        }
                    );

                endField.appendChild(
                    endLabel
                );

                endField.appendChild(
                    endPicker
                );


                /*
                 * Build date controls.
                 */
                dateInputs.appendChild(
                    startField
                );

                dateInputs.appendChild(
                    endField
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
 *
 * Board scope, not card scope - see the comment
 * on getDateStorageKey() for why (avoids forcing
 * Trello to reload this whole iframe on every edit).
 */
async function saveDate(
    cardId,
    itemId,
    type,
    value
) {

    try {

        const storageKey =
            getDateStorageKey(cardId);

        /*
         * Get existing Power-Up data.
         */
        const currentData =
            await t.get(
                'board',
                'shared',
                storageKey,
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
         * Save it at board scope.
         */
        await t.set(
            'board',
            'shared',
            storageKey,
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

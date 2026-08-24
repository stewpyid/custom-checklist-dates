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
 * at a time. Tracks which wrapper (if any)
 * currently owns the open popup, so clicking
 * the same trigger twice toggles it closed
 * instead of closing-then-immediately-reopening.
 */
let openPopupCleanup = null;
let openPopupOwner = null;

function closeOpenPopup() {

    if (openPopupCleanup) {

        openPopupCleanup();

        openPopupCleanup = null;

        openPopupOwner = null;

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

            /*
             * If this trigger's popup is already
             * open, treat this click as "close it"
             * and stop - don't immediately reopen.
             */
            const wasOpenForThisTrigger =
                openPopupOwner === wrapper;

            closeOpenPopup();

            if (wasOpenForThisTrigger) {

                return;
            }


            const baseDate =
                parseIsoDate(currentIso) ||
                new Date();

            let visibleYear =
                baseDate.getFullYear();

            let visibleMonth =
                baseDate.getMonth();


            function positionPopup(popup) {

                /*
                 * Popup is appended to <body>, not
                 * nested inside the (possibly dimmed/
                 * completed) task row - so it can't
                 * inherit a reduced opacity from an
                 * ancestor, and isn't affected by any
                 * ancestor's overflow/clipping either.
                 * Position is computed from the
                 * trigger's real screen coordinates
                 * instead of relying on CSS anchoring
                 * to a parent.
                 */
                const triggerRect =
                    trigger.getBoundingClientRect();

                const popupHeight =
                    popup.offsetHeight;

                const popupWidth =
                    popup.offsetWidth;

                const spaceBelow =
                    window.innerHeight -
                    triggerRect.bottom;

                const shouldFlipUp =
                    spaceBelow < popupHeight + 8 &&
                    triggerRect.top > popupHeight + 8;

                const top =
                    shouldFlipUp
                        ? triggerRect.top - popupHeight - 4
                        : triggerRect.bottom + 4;

                /*
                 * Right-align the popup with the
                 * trigger's right edge, clamped so
                 * it never goes off the left side
                 * of the iframe.
                 */
                const left =
                    Math.max(
                        4,
                        triggerRect.right - popupWidth
                    );

                popup.style.top = top + 'px';

                popup.style.left = left + 'px';
            }


            function render() {

                const existingPopup =
                    document.querySelector(
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

                document.body.appendChild(
                    popup
                );

                positionPopup(popup);

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


            openPopupOwner = wrapper;

            openPopupCleanup = function () {

                const existingPopup =
                    document.querySelector(
                        '.calendar-popup'
                    );

                if (existingPopup) {

                    existingPopup.remove();
                }
            };
        }
    );

    wrapper.appendChild(trigger);

    /*
     * Exposed so a later diff-based update can sync
     * this picker's displayed value in place (e.g. if
     * date data changed externally) without having to
     * destroy and recreate it - which would also lose
     * any popup currently open on it.
     */
    return {

        element: wrapper,

        getValue: function () {

            return currentIso;
        },

        setValue: function (newIsoDate) {

            currentIso = newIsoDate || '';

            refreshTriggerLabel();
        }
    };
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
 * When we save a date ourselves, Trello re-invokes
 * this render callback (per Trello's own docs:
 * card-back-section iframes' render is re-triggered
 * whenever pluginData changes via t.set()). Since we
 * already know locally what changed and have already
 * updated the DOM/trigger label optimistically, we
 * don't need - or want - to tear down and rebuild the
 * whole list again (re-fetching every checklist's
 * items over REST) just because of our own save. This
 * flag lets saveDate() tell the next render() call to
 * skip that redundant rebuild.
 */
let skipNextRender = false;


/*
 * Tracks what's currently built in the DOM so that
 * re-renders triggered by EXTERNAL changes (e.g.
 * checking an item off on the actual Trello checklist,
 * from anywhere - not something we caused) can patch
 * only what actually changed, instead of tearing down
 * and rebuilding the entire list every time. That full
 * rebuild was the source of the visible "flash".
 *
 * Shape:
 * {
 *   cardId,
 *   checklistOrder: [checklistId, ...],
 *   checklists: Map(checklistId -> {
 *     sectionEl, titleEl, emptyMessageEl (or null),
 *     itemOrder: [itemId, ...],
 *     items: Map(itemId -> {
 *       rowEl, nameEl, startPicker, endPicker, isComplete
 *     })
 *   })
 * }
 */
let renderedCard = null;


/*
 * Builds a single checklist item's row. Used both
 * for the initial full build and for adding a row
 * that's new since the last render.
 */
function buildItemRow(item, dates, cardId) {

    const isComplete =
        item.state === 'complete';

    const row =
        document.createElement('div');

    row.className =
        'task-row' +
        (isComplete ? ' is-complete' : '');


    const name =
        document.createElement('div');

    name.className =
        'task-name' +
        (isComplete ? ' is-complete' : '');

    name.textContent =
        item.name;


    const dateInputs =
        document.createElement('div');

    dateInputs.className =
        'date-inputs';


    /*
     * START field.
     */
    const startField =
        document.createElement('div');

    startField.className =
        'date-field';

    const startLabel =
        document.createElement('span');

    startLabel.className =
        'date-label';

    startLabel.textContent =
        'Start';

    const startPicker =
        createDatePicker(
            dates.start,
            async function (newValue) {

                await saveDate(
                    cardId,
                    item.id,
                    'start',
                    newValue
                );
            }
        );

    startField.appendChild(startLabel);

    startField.appendChild(
        startPicker.element
    );


    /*
     * END field.
     */
    const endField =
        document.createElement('div');

    endField.className =
        'date-field';

    const endLabel =
        document.createElement('span');

    endLabel.className =
        'date-label';

    endLabel.textContent =
        'End';

    const endPicker =
        createDatePicker(
            dates.end,
            async function (newValue) {

                await saveDate(
                    cardId,
                    item.id,
                    'end',
                    newValue
                );
            }
        );

    endField.appendChild(endLabel);

    endField.appendChild(
        endPicker.element
    );


    dateInputs.appendChild(startField);

    dateInputs.appendChild(endField);

    row.appendChild(name);

    row.appendChild(dateInputs);


    return {

        rowEl: row,

        nameEl: name,

        startPicker: startPicker,

        endPicker: endPicker,

        isComplete: isComplete
    };
}


/*
 * Builds a whole checklist section (title + all its
 * item rows) from scratch. Used for the initial full
 * build and whenever a brand new checklist shows up
 * on the card since the last render.
 */
function buildChecklistSection(
    checklist,
    items,
    savedDates,
    cardId
) {

    const section =
        document.createElement('div');

    section.className =
        'checklist-section';

    const title =
        document.createElement('div');

    title.className =
        'checklist-title';

    title.textContent =
        checklist.name;

    section.appendChild(title);


    const itemsMap = new Map();

    const itemOrder = [];

    let emptyMessageEl = null;

    if (items.length === 0) {

        emptyMessageEl =
            document.createElement('div');

        emptyMessageEl.className =
            'empty-message';

        emptyMessageEl.textContent =
            'No items in this checklist.';

        section.appendChild(
            emptyMessageEl
        );

    } else {

        for (const item of items) {

            const dates =
                savedDates[item.id] || {

                    start: '',

                    end: ''
                };

            const rowData =
                buildItemRow(
                    item,
                    dates,
                    cardId
                );

            section.appendChild(
                rowData.rowEl
            );

            itemsMap.set(
                item.id,
                rowData
            );

            itemOrder.push(item.id);
        }
    }

    return {

        sectionEl: section,

        titleEl: title,

        emptyMessageEl: emptyMessageEl,

        itemOrder: itemOrder,

        items: itemsMap
    };
}


/*
 * Patches an existing checklist section's items in
 * place to match freshly fetched data: removes rows
 * for items that disappeared, adds rows for new
 * items, and updates name/complete-state/date values
 * on rows that already exist - without touching rows
 * that haven't changed (so an open date picker popup
 * on an unrelated row is never disturbed).
 */
function diffChecklistItems(
    entry,
    items,
    savedDates,
    cardId
) {

    const newIds =
        items.map(function (item) {

            return item.id;
        });


    /*
     * Remove rows for items no longer present.
     */
    for (
        const oldId
        of [...entry.itemOrder]
    ) {

        if (!newIds.includes(oldId)) {

            const oldRow =
                entry.items.get(oldId);

            if (oldRow) {

                oldRow.rowEl.remove();
            }

            entry.items.delete(oldId);
        }
    }

    entry.itemOrder =
        entry.itemOrder.filter(
            function (id) {

                return newIds.includes(id);
            }
        );


    /*
     * Add or update rows for current items.
     */
    for (const item of items) {

        const dates =
            savedDates[item.id] || {

                start: '',

                end: ''
            };

        const isComplete =
            item.state === 'complete';

        let rowData =
            entry.items.get(item.id);

        if (!rowData) {

            /*
             * New item since last render - build
             * and append its row. (Exact insertion
             * order among brand-new items isn't
             * preserved precisely here, which is an
             * acceptable tradeoff for how rarely
             * items get reordered mid-edit.)
             */
            rowData =
                buildItemRow(
                    item,
                    dates,
                    cardId
                );

            entry.items.set(
                item.id,
                rowData
            );

            entry.itemOrder.push(
                item.id
            );

            entry.sectionEl.appendChild(
                rowData.rowEl
            );

        } else {

            /*
             * Existing item - patch only what
             * changed.
             */
            if (
                rowData.nameEl.textContent !==
                item.name
            ) {

                rowData.nameEl.textContent =
                    item.name;
            }

            if (
                rowData.isComplete !==
                isComplete
            ) {

                rowData.isComplete =
                    isComplete;

                rowData.nameEl.classList.toggle(
                    'is-complete',
                    isComplete
                );

                rowData.rowEl.classList.toggle(
                    'is-complete',
                    isComplete
                );
            }

            if (
                rowData.startPicker.getValue() !==
                (dates.start || '')
            ) {

                rowData.startPicker.setValue(
                    dates.start || ''
                );
            }

            if (
                rowData.endPicker.getValue() !==
                (dates.end || '')
            ) {

                rowData.endPicker.setValue(
                    dates.end || ''
                );
            }
        }
    }


    /*
     * Toggle the "no items" message.
     */
    if (
        entry.itemOrder.length === 0 &&
        !entry.emptyMessageEl
    ) {

        entry.emptyMessageEl =
            document.createElement('div');

        entry.emptyMessageEl.className =
            'empty-message';

        entry.emptyMessageEl.textContent =
            'No items in this checklist.';

        entry.sectionEl.appendChild(
            entry.emptyMessageEl
        );

    } else if (
        entry.itemOrder.length > 0 &&
        entry.emptyMessageEl
    ) {

        entry.emptyMessageEl.remove();

        entry.emptyMessageEl = null;
    }
}


/*
 * Patches the whole checklist list in place: removes
 * sections for checklists that disappeared, adds
 * sections for new checklists, and diffs items within
 * checklists that already exist. Checklist-level
 * reordering isn't specially handled since it's rare
 * mid-edit - new checklists are appended at the end.
 */
function diffChecklists(
    container,
    checklistDataList,
    savedDates,
    cardId
) {

    const newIds =
        checklistDataList.map(
            function (entry) {

                return entry.checklist.id;
            }
        );


    for (
        const oldId
        of [...renderedCard.checklistOrder]
    ) {

        if (!newIds.includes(oldId)) {

            const old =
                renderedCard.checklists.get(
                    oldId
                );

            if (old) {

                old.sectionEl.remove();
            }

            renderedCard.checklists.delete(
                oldId
            );
        }
    }

    renderedCard.checklistOrder =
        renderedCard.checklistOrder.filter(
            function (id) {

                return newIds.includes(id);
            }
        );


    for (
        const { checklist, items }
        of checklistDataList
    ) {

        let entry =
            renderedCard.checklists.get(
                checklist.id
            );

        if (!entry) {

            entry =
                buildChecklistSection(
                    checklist,
                    items,
                    savedDates,
                    cardId
                );

            container.appendChild(
                entry.sectionEl
            );

            renderedCard.checklists.set(
                checklist.id,
                entry
            );

            renderedCard.checklistOrder.push(
                checklist.id
            );

        } else {

            if (
                entry.titleEl.textContent !==
                checklist.name
            ) {

                entry.titleEl.textContent =
                    checklist.name;
            }

            diffChecklistItems(
                entry,
                items,
                savedDates,
                cardId
            );
        }
    }
}


/*
 * Start the iframe.
 */
t.render(async function () {

    if (skipNextRender) {

        skipNextRender = false;

        return;
    }


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

            renderedCard = null;

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
         * Get a token once up front - needed for
         * every checklist's items below.
         */
        const restApi =
            await t.getRestApi();

        const authorized =
            await restApi.isAuthorized();

        if (!authorized) {

            renderedCard = null;

            container.innerHTML = `
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

            await t.sizeTo(
                '#checklist-container'
            );

            return;
        }

        const apiToken =
            await restApi.getToken();


        /*
         * Fetch every checklist's items up front.
         */
        const checklistDataList = [];

        for (
            const checklist
            of card.checklists
        ) {

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

            checklistDataList.push({

                checklist: checklist,

                items: items
            });
        }


        if (
            !renderedCard ||
            renderedCard.cardId !== card.id
        ) {

            /*
             * First render for this card (or the
             * card changed) - build everything
             * from scratch.
             */
            container.innerHTML = '';

            const checklists = new Map();

            const checklistOrder = [];

            for (
                const { checklist, items }
                of checklistDataList
            ) {

                const entry =
                    buildChecklistSection(
                        checklist,
                        items,
                        savedDates,
                        card.id
                    );

                container.appendChild(
                    entry.sectionEl
                );

                checklists.set(
                    checklist.id,
                    entry
                );

                checklistOrder.push(
                    checklist.id
                );
            }

            renderedCard = {

                cardId: card.id,

                checklistOrder: checklistOrder,

                checklists: checklists
            };

        } else {

            /*
             * Re-render triggered by a change we
             * didn't cause ourselves (e.g. an item
             * checked off from the card front) -
             * patch only what actually changed.
             */
            diffChecklists(
                container,
                checklistDataList,
                savedDates,
                card.id
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

        /*
         * Force a full rebuild next time we get a
         * good render, since we don't know what
         * state the DOM was left in.
         */
        renderedCard = null;

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
         * This save is about to trigger Trello to
         * re-invoke render() - tell it to skip the
         * rebuild since we already reflect this
         * change locally.
         */
        skipNextRender = true;


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

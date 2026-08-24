const t = TrelloPowerUp.iframe();

const STORAGE_KEY = 'custom-checklist-dates';

t.render(async function () {

    const container = document.getElementById('checklist-container');

    container.innerHTML = `
        <div style="
            padding: 10px;
            font-family: sans-serif;
            font-size: 13px;
        ">
            Connecting to Trello...
        </div>
    `;

    try {

        console.log('[Checklist Dates] iframe started');

        /*
         * Get information about the current Trello context.
         */
        const context = await t.getContext();

        console.log(
            '[Checklist Dates] Context:',
            context
        );

        /*
         * Get the current card's checklist data.
         */
        const card = await t.card('checklists');

        console.log(
            '[Checklist Dates] Card data:',
            card
        );

        /*
         * Display the raw data temporarily.
         *
         * This lets us see exactly what Trello is returning.
         */
        container.innerHTML = `
            <div style="
                padding: 10px;
                font-family: monospace;
                font-size: 12px;
                white-space: pre-wrap;
                word-break: break-word;
            ">
                ${escapeHtml(JSON.stringify(card, null, 2))}
            </div>
        `;

        await t.sizeTo('#checklist-container');

    } catch (error) {

        console.error(
            '[Checklist Dates] ERROR:',
            error
        );

        container.innerHTML = `
            <div style="
                padding: 10px;
                font-family: sans-serif;
                font-size: 13px;
                color: #c9372c;
            ">
                <strong>Power-Up Error</strong>

                <br><br>

                ${escapeHtml(
                    error?.message ||
                    String(error)
                )}
            </div>
        `;

        await t.sizeTo('#checklist-container');
    }

});


function escapeHtml(value) {

    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');

}

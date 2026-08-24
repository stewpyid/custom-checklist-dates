const APP_KEY = '366dbe929f3398a21e20a250d3fa4c17';
const APP_NAME = 'Checklist Date Ranges';

window.TrelloPowerUp.initialize(
    {

        /*
         * Tell Trello whether the current user
         * has authorized the Power-Up's REST API access.
         */
        'authorization-status': async function (t) {

            const restApi = await t.getRestApi();

            const authorized =
                await restApi.isAuthorized();

            return {
                authorized: authorized
            };
        },


        /*
         * Trello calls this when the user needs
         * to authorize the Power-Up.
         */
        'show-authorization': function (t) {

            return t.popup({
                title: 'Authorize Checklist Dates',

                url: './authorize.html',

                height: 180
            });
        },


        /*
         * Display our Power-Up on the back
         * of every Trello card.
         */
        'card-back-section': function (t) {

            return {

                title: 'Checklist Date Ranges',

                /*
                 * REQUIRED by Trello - must be
                 * an absolute URL to a gray/
                 * monochrome icon. Without this
                 * Trello refuses to render the
                 * section at all ("Missing valid
                 * icon" in the console).
                 */
                icon: 'https://stewpyid.github.io/custom-checklist-dates/icon.png',

                content: {

                    type: 'iframe',

                    url: t.signUrl(
                        './checklist-dates.html'
                    ),

                    height: 300
                }
            };
        }

    },

    /*
     * REST API configuration.
     *
     * The API KEY is safe to have in public
     * source code.
     *
     * DO NOT put a Trello USER TOKEN or
     * API SECRET here.
     */
    {
        appKey: APP_KEY,

        appName: APP_NAME
    }
);

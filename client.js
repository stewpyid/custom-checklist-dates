const APP_KEY = '366dbe929f3398a21e20a250d3fa4c17';
const APP_NAME = 'Checklist Date Ranges';

window.TrelloPowerUp.initialize(
    {
        'authorization-status': function (t) {
            return t.getRestApi()
                .isAuthorized()
                .then(function (authorized) {
                    return {
                        authorized: authorized
                    };
                });
        },

        'show-authorization': function (t) {
            return t.popup({
                title: 'Authorize Checklist Dates',
                url: './authorize.html',
                height: 180
            });
        },

        'card-back-section': function (t) {
            return {
                title: 'Checklist Date Ranges',

                content: {
                    type: 'iframe',
                    url: t.signUrl('./checklist-dates.html'),
                    height: 300
                }
            };
        }
    },

    {
        appKey: APP_KEY,
        appName: APP_NAME
    }
);

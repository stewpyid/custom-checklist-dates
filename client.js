TrelloPowerUp.initialize(
    {

        'card-back-section': function (t, options) {

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
        appKey: '366dbe929f3398a21e20a250d3fa4c17',
        appName: 'Checklist Date Ranges'
    }
);

TrelloPowerUp.initialize({
    'card-back-section': function (t, options) {
        return {
            title: 'Checklist Date Ranges',
            icon: './icon.png',
            content: {
                type: 'iframe',
                url: t.signUrl('./checklist-dates.html'),
                height: 300
            }
        };
    }
});

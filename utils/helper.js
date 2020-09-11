exports.calculateCompatibity = compatibility => {
	if (compatibility === 0) {
		return 'zero';
	} else if (compatibility > 0 && compatibility < 50) {
		return 'bad';
	} else if (compatibility >= 50 && compatibility < 60) {
		return 'average';
	} else if (compatibility >= 60 && compatibility < 75) {
		return 'good';
	} else if (compatibility >= 75 && compatibility < 100) {
		return 'excellent';
	} else if (compatibility === 100) {
		return 'love';
	}
};

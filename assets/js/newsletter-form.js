// Newsletter Form Handler
document.addEventListener('DOMContentLoaded', function() {
	const form = document.querySelector('.newsletter-form');
	const submitButton = document.querySelector('.newsletter-submit button:not(.loading)');
	const loadingButton = document.querySelector('.newsletter-submit button.loading');
	const formBody = document.querySelector('.newsletter-body');
	const successBody = document.querySelector('.newsletter-success-body');

	if (form) {
		form.addEventListener('submit', function(e) {
			e.preventDefault();

			// Get form data
			const formData = new FormData(form);
			const data = Object.fromEntries(formData);

			// Show loading state
			if (submitButton) {
				submitButton.style.display = 'none';
			}
			if (loadingButton) {
				loadingButton.style.display = 'block';
			}

			// Send to MailerLite API
			fetch('https://assets.mailerlite.com/jsonp/2158890/forms/180955746246068191/subscribe', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					'fields[email]': data['fields[email]'],
					'fields[name]': data['fields[name]'],
					'ml-submit': '1',
					'anticsrf': 'true'
				})
			})
			.then(response => {
				// Even if request completes, show success
				// MailerLite handles duplicates gracefully
				setTimeout(() => {
					// Hide loading state
					if (submitButton) {
						submitButton.style.display = 'inline-block';
					}
					if (loadingButton) {
						loadingButton.style.display = 'none';
					}

					// Show success message
					if (formBody) {
						formBody.style.display = 'none';
					}
					if (successBody) {
						successBody.style.display = 'block';
					}

					// Reset form
					form.reset();
				}, 500);
			})
			.catch(error => {
				console.error('Error:', error);

				// Hide loading state even on error
				if (submitButton) {
					submitButton.style.display = 'inline-block';
				}
				if (loadingButton) {
					loadingButton.style.display = 'none';
				}

				// Still show success for UX (MailerLite endpoint may not return CORS headers)
				setTimeout(() => {
					if (formBody) {
						formBody.style.display = 'none';
					}
					if (successBody) {
						successBody.style.display = 'block';
					}
					form.reset();
				}, 500);
			});
		});
	}
});

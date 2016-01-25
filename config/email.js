// config/email.js
module.exports = {
	host: "smtp.cauli.kinghost.net", // hostname
	secureConnection: false,
	port: 587, // port for secure SMTP
	requiresAuth: true,
	domains: ["cauli.kinghost.net"],
	tls: {ciphers:'SSLv3',
         rejectUnauthorized:false
    },
	auth: {
	user: "checkwithmates@cauli.kinghost.net",
	pass: "nottherealpassword"
	}
};
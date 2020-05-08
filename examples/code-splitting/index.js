const http = require('http');
const App = require('./public/App.js');
const port = 3000

const requestHandler = (request, response) => {
	let url = 'http://' + request.headers.host + request.url;
	const { head, html, css } = App.render({ url: url });
	let output = `<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>Document</title>
		<link rel='stylesheet' href='http://localhost:5000/global.css'>
		<link rel='stylesheet' href='http://localhost:5000/build/bundle.css'>
		<script defer src='http://localhost:5000/build/bundle.js'></script>
	</head>
	<body>${html}</body>
	</html>`;
	response.end(output);
}

const server = http.createServer(requestHandler)

server.listen(port, (err) => {
	if (err) {
		return console.log('something bad happened', err)
	}
	console.log(`server is listening on ${port}`)
})
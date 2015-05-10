var fs = require("fs");
var http = require("http");

var CANVAS_SIZE = 200;

/* Array of objects {x,y,c,v} representing cells that have been changed.
 * x = column
 * y = row
 * c = color
 * v = visited */
var recentlyChangedCells = [];

/* Multidimensional Array storing all columns and rows of colors in the table. */
var canvas = [];
for(var i=0; i<CANVAS_SIZE; i++)
{
    canvas[i] = [];
    for(var j=0; j<CANVAS_SIZE; j++) {
        canvas[i][j] = "#ffffff";
    }
}

init();

/* Initialize server on specified port. */
function init()
{
    var server = http.createServer( serverFn );

    var port;
    if( process.argv.length < 3 )
    {
        port = 8080;
    }
    else
    {
        port = parseInt( process.argv[2] );
    }

    server.listen( port );
}

function serverFn(req,res)
{
    var filename = req.url.substring( 1, req.url.length );
    
    if(filename === "")
    {
        filename = "./index.html";
    }
    
    if(filename.indexOf("get_changed_cells") > -1)
    {
        sendChangedCells( req, res );
    }
    else if(filename.indexOf("change_cells") > -1)
    {
        // We are changing some cells (maybe).
        var urlData = filename.split("change_cells")[1];
        if(urlData.indexOf("?") > -1) {
            // Parse URL into an array of cells.
            getCellsFromUrl( urlData );
            filename = "./index.html";
            serveFile( filename, req, res );
        } else {
            // No cells were passed as parameters in the URL, so just return index.html.
            filename = "./index.html";
            serveFile( filename, req, res );
        }
    }
    else
    {
        serveFile(filename, req, res);
    }
}

/* Parse URL into an array of cells. */
function getCellsFromUrl( urlData )
{
    var queryData = urlData.split("?")[1];
    var fields = queryData.split("&");
    for(var i=0; i<fields.length; i++) {
        var fieldSplit = fields[i].split("=");
        if(fieldSplit.length > 1) {
            var fieldValue = fieldSplit[1];
            var cellCoords = fieldValue.split("-"); // split on dash
            if(cellCoords.length === 3) {
                var color = cellCoords[2];
                if(!isNaN(parseInt(color, 16))) {
                    color = "#"+cellCoords[2];
                }
                try {
                    canvas[parseInt(cellCoords[1])][parseInt(cellCoords[0])] = color;
                } catch(e) {
                    console.log("Error: Couldn't find specified cell from URL in the canvas.");
                }
            }
        }
    }
}

/* Load a file */
function serveFile( filename, req, res )
{
    var contents;
    try
    {
    	contents = getFileContents( filename );
    }
    catch( e )
    {
        /* Return a 404 page */
        fourZeroFour(filename, res);
        return;
    }
    
    var extension = "html";
    try {
        extension = filename.split(/.\./)[1];
        if(extension === "js") {
            extension = "javascript";
        }
    } catch(e) {
        // Do nothing.
    }

    res.writeHead( 200, {'Content-Type':'text/'+extension} );
    res.end( contents );
}

function getFileContents(filename) {
    return fs.readFileSync( filename ).toString();
}

function sendChangedCells(req, res)
{
    res.writeHead(200, {'Content-Type':'application/json'});
    res.end(JSON.stringify(canvas));
    /*
    for(var i=0; i<recentlyChangedCells.length; i++) {
        // If the cell has been visited, delete it.
        // But this doesn't work for multiple clients, because there isn't
        // a way to know if all clients have visited these cells.
    }
    recentlyChangedCells = [];
    */
}

/* DEPRECATED. This function is no longer used. */
function changeCells(filename, req, res, cells)
{
    var cell;
    for(var i=0; i<cells.length; i++) {
        cell = cells[i];
        var foundMatch = false;
        for(var j=0; j<recentlyChangedCells.length; j++) {
            var oldCell = recentlyChangedCells[j];
            if(oldCell.x === cell.x && oldCell.y === cell.y) {
                oldCell.c = cell.c;
                oldCell.v = false;
                foundMatch = true;
            }
        }
        if(!foundMatch) {
            recentlyChangedCells.push(cell);
        }
    }
    for(i=0; i<recentlyChangedCells.length; i++)
    {
        cell = recentlyChangedCells[i];
        //if(!cell.v) {
            cell.v = true;
            canvas[cell.y][cell.x] = cell.c;
        //}
    }
    serveFile(filename, req, res);
}

/* Return a 404 page */
function fourZeroFour(filename, res) {
	console.log( "Error: Something bad happened trying to open "+filename );
    res.writeHead(404, {'Content-Type':'text/plain'});
    res.write("404 : File Not Found");
    res.end();
}
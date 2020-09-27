function startPageCounter(interval) {
    var counter = interval;
    $('pageCounter').text(interval);
    setInterval(function () {
        counter -= 1;
        if (counter === -1)
            counter = interval - 1;
        $('#pageCounter').text(counter);
    }, 1000)
}

function updateStaleCounter(a_data) {
    $('#staleCounter').text(a_data.counter);
}

// Switch pages
function switchPage(pageNo, isLastPage) {
    // pageNo starting from index 0 whereas nth-child is index 1
    $('.dot:nth-child(' + (parseInt(pageNo) + 1) + ')').removeClass('current');
    $('#p_' + pageNo).fadeOut(1000);
    if (isLastPage) {
        $('.dot:first-child').addClass('current');
        setTimeout(function () { $('#p_0').fadeIn(1000); }, 1100);
    } else {
        $('.dot:nth-child(' + (parseInt(pageNo) + 2) + ')').addClass('current');
        setTimeout(function () { $('#p_' + (parseInt(pageNo) + 1)).fadeIn(1000); }, 1100);
    }
}

function removeReservedChrs(str) {
    // Remove any characters which may conflict with jQuery selectors
    str = str.replace(/[\.\+\$\s+\\\\()#~',:-]/g, '');
    // If inside the test result file contains characters like >?*, e.g. FloTHERM V?
    // A more comprehensive expression:
    // (Not included in the expression above because file names cannot contain these characters)
    //str = str.replace(/[\.\*\+\?\$\^\"\s+\|\\\\\/()<>#~',:-]/g, '');
    return str;
}

function createTitle(a_table) {
    var titleContainer = $('<header>').addClass('title');
    var title = $('<h2>');
    var product = $('<span>').text(a_table.Product[0]);
    var branch = $('<span>').text(a_table.Branch[0]);
    var type = $('<span>').text(a_table.Type[0]);

    $(title).append(product, branch, type);
    $(titleContainer).append(title);

    return titleContainer;
}

function createTable(a_table) {
    var tableObj = $('<table>');

    var thead = createTableHeader(a_table);

    var tbody = createTableBody(a_table);

    // Add head and body to table
    $(tableObj).append(thead, tbody);

    return tableObj;
}

function createTableHeader(a_table) {
    // Create header section
    var thead = $('<thead>');
    // Create table header
    for (i = 0; i < 2; i++) {
        var header = $('<tr>');
        $(header).append($('<th>'));

        a_table.Platforms.forEach(function (platform) {
            // Output platforms
            if (i === 0) {
                var th = $('<th>', { text: platform, colSpan: 2 });
                $(header).append(th);
                // Output pass fails
            } else {
                for (i = 0; i < 2; i++) {
                    if (i === 0)
                        var text = 'Pass';
                    else
                        var text = 'Fail';
                    var th = $('<th>', { text: text, class: 'passFailHeader' });
                    $(header).append(th);
                }
            }
        });
        $(thead).append(header);
    }
    return thead;
}

function createTableBody(a_table) {
    // Define prefix for id tags
    var prefix = a_table.Product[0] + a_table.Branch[0] + a_table.Type[0];
    // Create body section
    var tbody = $('<tbody>');
    // Create test suite rows
    a_table.Tests.forEach(function (test) {
        var testSuite = $('<tr>')
        var testName = $('<td>', { text: test, class: 'testSuite' });
        $(testSuite).append(testName);
        a_table.Platforms.forEach(function (platform) {
            var testFilePass = $('<td>', { id: removeReservedChrs(prefix + test + platform) + 'pass' });
            var testFileFail = $('<td>', { id: removeReservedChrs(prefix + test + platform) + 'fail' });
            $(testSuite).append(testFilePass, testFileFail);
        });
        $(tbody).append(testSuite);
    });
    return tbody;
}

function getPrefix(a_report) {
    var prefix = a_report.get("Product") +
                 a_report.get("Branch") +
                 a_report.get("Type") +
                 a_report.get("TestName") +
                 a_report.get("Platform");
    prefix = removeReservedChrs(prefix);
    return prefix;
}

function setPassFail(a_data) {
    let prefix = getPrefix(a_data.Report);

    let passId = prefix + 'pass';
    let td = document.getElementById(passId);
    if (td) {
        td.innerText = a_data.Report.get("Pass");
        clearLayoutErr(a_data);
    } else {
        notInLayout(a_data);
    }

    let failId = prefix + 'fail';
    td = document.getElementById(failId);
    td.innerText = a_data.Report.get("Fail");
    if (td.innerText === '0')
        $('#' + failId).removeClass().addClass('greenBackground');
    else
        $('#' + failId).removeClass().addClass('redBackground');
}

function clearPassFail(a_data) {
    let prefix = getPrefix(a_data.Report);

    let passId = prefix + 'pass';
    if (document.getElementById(passId))
        $('#' + passId).text('');
    else
        clearLayoutErr(a_data);

    let failId = prefix + 'fail';
    $('#' + failId).removeClass().addClass('staleBackground');
    $('#' + failId).text('');
}

function setStale(a_data) {
    let prefix = getPrefix(a_data.Report);

    let failId = prefix + 'fail';
    $('#' + failId).removeClass().addClass('staleBackground');
}

function getFileNameOnly(a_file) {
    var split = a_file.split('\\');
    return split.pop()
}

function setErr(a_data) {
    var keys = "";
    a_data.FaultyKeys.forEach(function (key) {
        keys += 'Key: ' + key + ' missing <br />';
    });

    // Append a prefix because file missing in layout file id in same way
    var rowId = 's_' + removeReservedChrs(a_data.File);

    // File is already listed in faults
    if (document.getElementById(rowId)) {
        $('#' + rowId + ' td:nth-of-type(2)').html(keys);
    // New file with faults
    } else {
        var row = $('<tr>', { id: rowId });
        var fileName = $('<td>').text(getFileNameOnly(a_data.File));
        var reason = $('<td>').html(keys);

        $(row).append(fileName, reason);
        $('.lastPage table').append(row);

        // Remove no err msg if displayed
        var isErrMsgNotDisplayed = $('#goodSyntax').hidden;
        if (!isErrMsgNotDisplayed)
            $('#goodSyntax').hide();
    }

    // Checks if file is moving from layout errors section to syntax errors section
    clearLayoutErr(a_data);
}

function clearErr(a_data) {
    var row = $('#s_' + removeReservedChrs(a_data.File));
    row.remove();
    if ($('.lastPage tr').length === 0)
        $('#goodSyntax').show();
}

function notInLayout(a_data) {
    var report = a_data.Report;

    var product = report.get("Product");
    var branch = report.get("Branch");
    var type = report.get("Type");
    var testName = report.get("TestName");
    var platform = report.get("Platform");

    // Checks if nothing to report message is displayed
    var noErrMsg = $('#goodLayout');
    if (!(noErrMsg.hidden))
        noErrMsg.hide();

    var html = platform + ' ' + testName + ' of ' + product + ' ' + branch + ' ' + type + ' does not exist in layout.txt <br />';
    html += 'File Location: ' + a_data.File;

    // Append a prefix because syntax errors id in same way
    var fileId = 'l_' + removeReservedChrs(a_data.File);
    var file = document.getElementById(fileId);

    // Checks if file was previously not in layout
    // Same file was previously not in layout
    if (file) {
        file.innerHTML = html;
    // File is either new or was previously in layout
    } else {
        var errMsg = $('<p>', { id: fileId,
                                html: html });
        $('#layoutContainer > div').append(errMsg);
    }
}

function clearLayoutErr(a_data) {
    var file = document.getElementById('l_' + removeReservedChrs(a_data.File));
    if (file)
        $(file).remove();
    // length === 1 for the hidden no errors message
    if ($('#layoutContainer > div > p').length === 1)
        $('#goodLayout').show();
}

// Wait for the DOM to be loaded
$(function () {
    var socket = io();

    socket.on('initialise', function (pages) {
        pages.forEach(function (page, pageNo) {
            // Add a dot to the footer
            $('.footer').append($('<span>', { class: 'dot' }));

            // Create container for page
            var pageContainer = $('<div>', { id: 'p_' + pageNo });

            // For each table in a page
            page.forEach(function (table, tableNo) {
                // Create stripe for separating items
                var stripe = $('<div>');

                // Create container for a test item i.e. title and table
                var itemContainer = $('<section>');

                // Create title
                var titleContainer = createTitle(table);

                // Create table
                var tableObj = createTable(table);

                // Group title and table
                $(itemContainer).append(titleContainer, tableObj)

                // Assign an item to a stripe
                $(stripe).append(itemContainer);

                // Add the stripe to page
                $(pageContainer).append(stripe);
            });
            // Append results page to webpage
            $('.resultPages').append(pageContainer);
        });

        // Add a dot for the errors page
        $('.footer').append($('<span>', { class: 'dot' }));

        // Assign id to enable switching page function
        // CSS based on .lastPage class and not id as id will change depending on no. of pages in layout file
        $('.lastPage').attr('id', 'p_' + pages.length);

        // Hide all pages except for the first one
        for (let i = 1; i <= pages.length; i++) {
            $('#p_' + i).hide();
        }
        // Highlight the first dot as the current page
        $('.dot:first-child').addClass('current');

        // Update switching page counter display value
        var pageInterval = 11;
        startPageCounter(pageInterval);

        // Shift through the pages
        var pageNo = 0;
        setInterval(function () {
            if (pageNo == pages.length) {
                var isLastPage = true;
                switchPage(pageNo, isLastPage);
                pageNo = 0;
            } else {
                var isLastPage = false;
                switchPage(pageNo, isLastPage)
                pageNo += 1;
            }
        }, pageInterval * 1000);
    });

    socket.on('invalidLayout', function () {
        $('.lastPage').hide();
        var errMsg = $('<div>').addClass('configErr');
        errMsg.append($('<p>', { html: 'layout.txt file incorrect. <br /><br />' + 
                                       'Please fix it and try again.' }));
        $('.container:first').append(errMsg);
    });


    socket.on('add', function (data) {
        data.Report = new Map(JSON.parse(data.Report));
        setPassFail(data);
    });


    socket.on('change', function (data) {
        data.Report = new Map(JSON.parse(data.Report));
        setPassFail(data);
    });


    socket.on('unlink', function (data) {
        data.Report = new Map(JSON.parse(data.Report));
        clearPassFail(data);
    });


    socket.on('stale', function (data) {
        data.Report = new Map(JSON.parse(data.Report));
        setStale(data);
    });

    socket.on('setErr', function (data) {
        setErr(data);
    });

    socket.on('removeErr', function (data) {
        clearErr(data);
    });

    socket.on('updateCounter', function (data) {
        updateStaleCounter(data);
    });
});
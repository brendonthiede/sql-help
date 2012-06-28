var columnInfoIndex = 0;

function addAnotherColumn() {
	columnInfoIndex++;
	var newRowId = 'columnInfo' + columnInfoIndex;
	$('#addAnotherColumn').before($('#columnInfo0').clone().attr('id', newRowId));
	$('#' + newRowId).find('input').eq(0)
		.attr('id', 'columnName' + columnInfoIndex)
		.attr('name', 'columnName' + columnInfoIndex)
		.val("")
		.change(function() { generateSql(); })
		.blur(function() { generateSql(); });
	$('#' + newRowId).find('input').eq(1)
		.attr('id', 'columnValue' + columnInfoIndex)
		.attr('name', 'columnValue' + columnInfoIndex)
		.val("")
		.change(function() { generateSql(); })
		.blur(function() { generateSql(); });
	$('#' + newRowId).append("<td><a href='#' style='color: red'><img src='images/remove.png' /><\/a><\/td>");
	
	assignColumnInfoNames();
	
	$('#addLink').focus();
}

function assignColumnInfoNames() {
	columnInfoIndex = 0;
	$('[id^="columnInfo"]').each(function() {
		var columnInfo = $(this);
		if (columnInfo.attr('id') != "columnInfo0") {
			columnInfoIndex++;
			columnInfo.attr('id', 'columnInfo' + columnInfoIndex);
			columnInfo.find('input').eq(0)
				.attr('id', 'columnName' + columnInfoIndex)
				.attr('name', 'columnName' + columnInfoIndex);
			columnInfo.find('input').eq(1)
				.attr('id', 'columnValue' + columnInfoIndex)
				.attr('name', 'columnValue' + columnInfoIndex);
			columnInfo.find('a').eq(0)
				.click(function() { removeColumnInfo(columnInfo); });
		}
	});
}

function removeColumnInfo(columnInfo) {
	columnInfo.remove();
	assignColumnInfoNames();
	generateSql();
}

function getTableName() {
	if ($('#tableName').val().length < 1) {
		return undefined;
	}
	return $('#tableName').val();
}

function getUsedColumnCount() {
	var columnCount = 0;
	for(var i = 0; i <= columnInfoIndex; i++) {
		columnName = getColumnName(i);
		if (columnName != undefined) {
			columnCount++;
		}
	}
	return columnCount;
}

function getWhereClause() {
	if ($('#whereClause').val().length > 0) {
		return "\r WHERE " + $('#whereClause').val().replace(/^\s*where /i, "").replace(/;\s*$/, "");
	}
	if ($('#allRecords').attr('checked') === "checked") {
		return "";
	}
	return undefined;
}

function getExpectedCount() {
	if (isNaN(parseInt($('#expectedCount').val())) || $('#expectedCount').val() < 1) {
		return undefined;
	}
	return $('#expectedCount').val();
}

function getErrorMessages(checkTable, checkColumns, checkWhereClause, checkAffectedCount) {
	var errMsg = "";
	if (checkTable && getTableName() == undefined) {
		errMsg += "\r-- Table Name is undefined";
	}
	if (checkColumns && getUsedColumnCount() === 0) {
		errMsg += "\r-- No columns defined";
	}
	if (checkWhereClause && getWhereClause() == undefined) {
		errMsg += "\r-- Where clause is undefined";
	}
	if (checkAffectedCount && getExpectedCount() == undefined) {
		errMsg += "\r-- Invalid # of Affected Records";
	}
	return errMsg.replace(/^\r/, "");
}

function getSelectCountStatement() {
	var errMsg = getErrorMessages(true, false, true, false);
	if (errMsg.length > 0) {
		return errMsg;
	}
	return "SELECT COUNT(1)\r  FROM " + getTableName() + getWhereClause() + ";";
}

function getColumnName(rowId) {
	var columnName = $('#columnName' + rowId).val();
	if (columnName == undefined || columnName.length == 0) {
		return undefined;
	}
	return columnName;
}

function getColumnValue(rowId) {
	var columnValue = $('#columnValue' + rowId).val();
	if (columnValue == undefined || columnValue.length == 0) {
		return "NULL";
	}
	return columnValue;
}

function getSelectStatement() {
	var errMsg = getErrorMessages(true, true, true, false);
	if (errMsg.length > 0) {
		return errMsg;
	}
	var sql = "SELECT";
	var columnName;
	var columnCount = 0;
	for(var i = 0; i <= columnInfoIndex; i++) {
		columnName = getColumnName(i);
		if (columnName != undefined) {
			columnCount++;
			sql += "\r       " + columnName + ",";
			sql += "\r       " + getColumnValue(i) + " AS " + $('#columnName' + i).val() + "_new_val,";
		}
	}
	sql = sql.replace(/,$/, "");
	sql += "\r  FROM " + getTableName() + getWhereClause() + ";";
	return sql;
}

function getUpdateStatement() {
	var sql = "UPDATE " + getTableName();
	var columnCount = 0;
	var columnName;
	var errMsg = "";
	for(var i = 0; i <= columnInfoIndex; i++) {
		columnName = getColumnName(i);
		if (columnName != undefined) {
			columnCount++;
			if (columnCount === 1) {
				sql += "\r   SET ";
			} else {
				sql += ",\r       "
			}
			sql += columnName + " = " + getColumnValue(i);
		}
	}
	sql += getWhereClause() + ";";
	return sql;
}

function getUpdatePlsqlBlock() {
	var errMsg = getErrorMessages(true, true, true, true);
	if (errMsg.length > 0) {
		return errMsg;
	}
	var sql = "DECLARE";
	var errMsg = "";
	if (getUpdateStatement().substr(0, 2) == "--") {
		errMsg += "\r" + getUpdateStatement();
	}
	if (isNaN(parseInt($('#expectedCount').val())) || $('#expectedCount').val() < 1) {
		errMsg += "\r-- Invalid # of Affected Records";
	}
	if (errMsg.length > 0) {
		return errMsg.replace(/^\r/, "");
	}
	sql += "\r  li_expected_cnt  PLS_INTEGER := " + $('#expectedCount').val() + ";";
	sql += "\r  li_actual_cnt    PLS_INTEGER;";
	sql += "\r  ls_err_msg       VARCHAR2(100);";
	sql += "\rBEGIN";
	sql += "\r";
	sql += "\r" + getUpdateStatement();
	sql += "\r";
	sql += "\r  li_actual_cnt := SQL%ROWCOUNT;";
	sql += "\r  IF li_actual_cnt <> li_expected_cnt THEN";
	sql += "\r    ls_err_msg := 'Incorrect number of records updated.';";
	sql += "\r    ls_err_msg := ls_err_msg||' Expected '||li_expected_cnt;";
	sql += "\r    ls_err_msg := ls_err_msg||' but was '||li_actual_cnt||'.';";
	sql += "\r    raise_application_error(-20001, ls_err_msg);";
	sql += "\r  END IF;";
	sql += "\r  COMMIT;";
	sql += "\rEXCEPTION";
	sql += "\r  WHEN OTHERS THEN";
	sql += "\r    ROLLBACK;";
	sql += "\r    RAISE;";
	sql += "\rEND;";
	return sql;
}

function updateSize($elem) {
  $elem.attr('rows', ('\r' + $elem.html()).match(/[^\r]*\r[^\r]*/gi).length);
}

function updateValue(name, value) {
	$('#' + name).text(value);
	updateSize($('#' + name));
}

function makeCountStatement() {
	updateValue("countStatement", getSelectCountStatement());
}

function makeSelectStatement() {
	updateValue("selectStatement", getSelectStatement());
}

function makePlsqlBlock() {
	updateValue("plsqlBlock", getUpdatePlsqlBlock());
}

function updateShareableLink() {
	$('#shareableLink').attr('href', 'index.html?' + $('#mainForm').serialize());
}

function generateSql() {
	makeCountStatement();
	makeSelectStatement();
	makePlsqlBlock();
	updateShareableLink();
}

function submitForm(elemId) {
	$('#' + elemId).submit();
}

function $_GET(query, str) {
	str = str ? str : window.location.search;
	var regEx = new RegExp('&' + query + '(?:=([^&]*))?(?=&|$)', 'i');
	return (str = str.replace(/^\?/, '&').replace(/\+/g, ' ').match(regEx)) ? (typeof str[1] == 'undefined' ? '' : decodeURIComponent(str[1])) : undefined;
}

function returnDocument() {
	var file_name = document.location.href;
	var end = (file_name.indexOf("?") == -1) ? file_name.length : file_name.indexOf("?");
	return file_name.substring(file_name.lastIndexOf("/") + 1, end);
}

function enableAutoUpdating() {
	$('input').change(function() { generateSql(); });
	$('textarea').change(function() { generateSql(); });
	$('input').blur(function() { generateSql(); });
	$('textarea').blur(function() { generateSql(); });
}

function populateValuesFromUrl() {
	$('#tableName').val($_GET('tableName'));
	var i = 0;
	while ($_GET('columnName' + i) !== undefined) {
		if (i > 0) {
			addAnotherColumn();
		}
		$('#columnName' + i).val($_GET('columnName' + i));
		if ($_GET('columnValue' + i) !== undefined) {
			$('#columnValue' + i).val($_GET('columnValue' + i));
		}
		i++;
	}
	$('#whereClause').val($_GET('whereClause'));
	if ($_GET('allRecords') == "on") {
		$('#allRecords').attr('checked', 'checked');
	}
	$('#expectedCount').val($_GET('expectedCount'));
}

function selectTextareaText(elemId) {
	$('#' + elemId).select();
}

function toggleCollapsible($elem) {
	var duration = 0;
	var target = $('#' + $elem.attr('data-collapseId'));
	if (target.is(":visible")) {
		$elem.find('img')
			.attr('src', "images/expand.png")
			.attr('alt', "Expand")
			.attr('title', "Expand");
		target.hide(duration);
	} else {
		$elem.find('img')
			.attr('src', "images/collapse.png")
			.attr('alt', "Collapse")
			.attr('title', "Collapse");
		target.show(duration);
	}
}

function getImgTag(src, msg) {
	return '<img src="' + src + '" alt="' + msg + '" title="' + msg + '" />'
}

function addExportStatementIcons() {
  $('.exportStatement').html(getImgTag("images/save.png", "Save the statement as a file"));
}

function removeExportStatementSpans(elem) {
  $('.exportStatement').each( function() {
    $(elem).remove();
  });
}

function enableExportStatement() {
	$.post("/common/php/export.php", { test: "True" },
		function(data) {
			if (data === 'PASS') {
				addExportStatementIcons();
			} else {
				removeExportStatementSpans(this);
			}
		}
	);
}

function enableSelectAll() {
	$('.selectAll').html(getImgTag("images/select-all.png", "Select all text for easy copying to clipboard"));
}

function enableCollapsers() {
	$('.collapser').click(function() { toggleCollapsible($(this)); });
}

function enableAllRecordsAlert() {
	$('#allRecords').click(function() {
		if (this.checked) {
			alert('WARNING: Your update will affect all records in the table if you do not provide a where clause!');
		};
	});
}

$(document).ready(function() {
	populateValuesFromUrl();
	enableAutoUpdating();
	enableCollapsers();
	enableSelectAll();
	enableExportStatement();
	enableAllRecordsAlert();
	generateSql();
	$('#tableName').focus();
});

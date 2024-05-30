/* SeamusIsANigger's implementation of BonziWORLD.org markup.
 * Public domain. Feel free to use it in any of your projects. */

var tags = {
	"**": ["<b>", "</b>"],
	"##": ["<font size=5>", "</font>"],
	"~~": ["<i>", "</i>"],
	"__": ["<u>", "</u>"],
	"--": ["<s>", "</s>"],
	"%%": ["<marquee>", "</marquee>"],
	"\\n": "<br>",
	"$r$": ["<font style='animation: rainbow 3s infinite;'>", "</font>"]
};
var tagsParameters = {
	"$$": [["<font color=\"", "\">"], "</font>"]
}
var stack = [];

function markup(text, removeMarkup) {
	if (removeMarkup == undefined)
		removeMarkup = false;
	var markup = Object.keys(tags), markupParameters = Object.keys(tagsParameters), output = "";
	for (var i = 0; i < text.length; ++i) {
		var markedUp = false;
		for (var i2 = 0; i2 < markup.length; ++i2) {
			var endOfString = i + markup[i2].length;
			if (endOfString > text.length)
				break;
			if (text.substring(i, endOfString) == markup[i2]) {
				markedUp = true;
				if (!removeMarkup && typeof tags[markup[i2]] != "object")
					output += tags[markup[i2]];
				else if (!removeMarkup) {
					var last = stack.pop();
					if (last == undefined || last != markup[i2]) {
						if (last)
							stack.push(last);
						output += tags[markup[i2]][0];
						stack.push(markup[i2]);
					}
					else
						output += tags[markup[i2]][1];
				}
				i += markup[i2].length - 1;
				break;
			}
		}
		for (var i2 = 0; i2 < markupParameters.length; ++i2) {
			var endOfString = i + markupParameters[i2].length;
			if (markedUp || endOfString > text.length)
				break;
			if (text.substring(i, endOfString) == markupParameters[i2]) {
				for (var i3 = endOfString; i3 < text.length; ++i3) {
					var endOfParameter = i3 + markupParameters[i2].length;
					if (endOfParameter > text.length)
						break;
					if (text.substring(i3, endOfParameter) == markupParameters[i2]) {
						markedUp = true;
						var param = text.substring(endOfString, i3);
						if (!removeMarkup) {
							var last = stack.pop();
							if (last == undefined || typeof last != "object" || last[0] != markupParameters[i2] || last[1] != param) {
								if (last)
									stack.push(last);
								output += `${tagsParameters[markupParameters[i2]][0][0]}${param.replace(/"/g, "&quot;")}${tagsParameters[markupParameters[i2]][0][1]}`;
								stack.push([markupParameters[i2],param]);
							}
							else
								output += tagsParameters[markupParameters[i2]][1];
						}
						i += (markupParameters[i2].length * 2) + param.length - 1;
						break;
					}
				}
			}
		}
		if (!markedUp)
			output += text.substring(i, i + 1);
	}
	if (!removeMarkup && stack.length != 0)
		for (var i = 0; i <= stack.length; ++i) {
			var tag = stack.pop();
			if (typeof tag == "object")
				output += tagsParameters[tag[0]][1];
			else
				output += tags[tag][1];
		}
	return output;
}

module.exports = markup;
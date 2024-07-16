# Stardew Syntax
Provides syntax highlighting for Stardew Valley's dialogue and events.
Syntax highlighting is applied to files with either the `.sdvevent` or `.sdvdialogue` extensions.
Syntax highlighting is also applies to strings in `.json`/`.jsonc` files that match the stardew valley event syntax.

# Formatting
A formatter is provided to make events more readable, as well as convert them back to an inline format.
* Copy an event string from a JSON file and paste it into an empty `.sdvevent` file.
* Run the document formatter:
  * Either use `Shift` + `Alt` + `F` to format the document
  * Or use `Ctrl` + `Shift` + `P` to open the command palette and search for `Format Document`
* The event will cleanly be broken up into multiple lines.

A multi-line event file can be converted back to the inline format used in JSON files
with the a convert to inline command.
* Open a `.sdvevent` file
* Use `Ctrl` + `Shift` + `P` to open the command palette.
* Search for `Stardew Syntax: Convert SDVEvent to Inline Format`

# Editable input

Allow to edit a resource property value in a REST application sending PUT requests

Example:

```html
<h3 data-object="post" data-property="title" data-url="/posts/1">Title here</h3>
```

```js
new EditableInput(document.querySelector('h3'));
```

When you edit the value using double click without cancelling you send a request like:

```
PUT /posts/1
post[title]=New title
```

If the request is successfull it assumes the value has been saved, and allows cancellation.

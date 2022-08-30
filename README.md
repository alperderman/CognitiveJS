# CognitiveJS

CognitiveJS (previously called [DCG](https://github.com/alperderman/dcg)) is a front-end JavaScript framework/library for rendering dynamically declared contents and templates on DOM. Compared to the other frameworks, Cognitive aims to write minimal amount code as possible.

Cognitive broadly inspired by [Knockout](https://knockoutjs.com/). As opposed to Knockout however, Cognitive doesn't have a design pattern and it can be used as a pre-processing framework with certain modifications.

See more information about it on documentation inside the repository.

###Example

```html
<html>
<head>
    <title>CognitiveJS</title>
</head>
<body>

    <p data-prop="text:'%hello%'"></p>

    <script src="cog.js"></script>
    <script>
        cog.data = {
            hello:"Hello World"
        };
        cog.bindAll();
    </script>

</body>
</html>
```

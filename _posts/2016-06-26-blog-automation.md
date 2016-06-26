---
categories:
- jekyll
- '''Blog'
date: 2016-06-26 00:39:06 -0700
layout: post
title: '''Blog Automation'
---
I'm writing a little tool to help with the workflow of writing a
Jekyll 'blog.

I call it `blog` because I didn't want to strain my memory.  It has
several subcommands, *a la* `git` or `jekyll` itself.  Here's the help
text.

    $ blog help
    usage: blog [-h] {help,describe,start,publish,push,serve} ...

    optional arguments:
      -h, --help            show this help message and exit

    commands:
      {help,describe,start,publish,push,serve}
        help                describe a command
        describe            describe a post
        start               start a new draft post.
        publish             publish a draft.
        push                push 'blog to GitHub.
        serve               start the Jekyll server.

The original problem that made me write a tool is that every jekyll
post has two date stamps.  One is in the filename:
`_posts/2016-01-01-some-title.md`.  And then, inside the post's front
matter, there's a full ISO date stamp:

{% highlight yaml %}
date: 2016-01-01 12:34:56 -0800
{% endhighlight %}

Now, instead of typing two date stamps, I type zero.  When I `publish`
a draft, the tool autogenerates both stamps.  And of course, it does
so atomically, so it's safe to publish on the cusp of midnight like an
embargoed tech journalist.

The `publish` subcommand also prohibits me from publishing in the
default category of **uncategorized**.  If I forget to set the category,
`publish` fails.

The `start` command automatically converts the title, "'Blog
Automation", to the slug, `blog-automation`, which appears in this
page's URL.

The other commands are just bells and whistles.  Some of them aren't
even implemented yet.  I'm sure I'll think of more things for `blog`
to do as I keep working on this 'blog.

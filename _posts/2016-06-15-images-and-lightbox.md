---
layout: post
title:  "Images and Lightbox"
date: 2016-06-15 14:34 -0700
categories: jekyll
publish: true
---
Let's see how images work.  These are supposed to be integrated with
lightbox.

Here are some samples.

<a href="/images/sample-1.jpg"
   data-lightbox="samples"
   data-title="A Sample Image">
  <img class="thumbnail"
       src="/images/sample-1_thumb.jpg"
       title="A Sample Image"
       alt="A Sample Image">
</a>
<a href="/images/sample-2.jpg"
   data-lightbox="samples"
   data-title="A Sample Image">
  <img class="thumbnail"
       src="/images/sample-2_thumb.jpg"
       title="A Sample Image"
       alt="A Sample Image">
</a>
<a href="/images/sample-3.jpg"
   data-lightbox="samples"
   data-title="A Sample Image">
  <img class="thumbnail"
       src="/images/sample-3_thumb.jpg"
       title="A Sample Image"
       alt="A Sample Image">
</a>
<a href="/images/sample-4.jpg"
   data-lightbox="samples"
   data-title="A Sample Image">
  <img class="thumbnail"
       src="/images/sample-4_thumb.jpg"
       title="A Sample Image"
       alt="A Sample Image">
</a>
<a href="/images/sample-5.jpg"
   data-lightbox="samples"
   data-title="A Sample Image">
  <img class="thumbnail"
       src="/images/sample-5_thumb.jpg"
       title="A Sample Image"
       alt="A Sample Image">
</a>

Jekyll doesn't really help here, though.  I had to write a wad of
HTML for each image.


{% highlight html %}
<a href="/images/sample-1.jpg"
   data-lightbox="samples"
   data-title="A Sample Image">
  <img class="thumbnail"
       src="/images/sample-1_thumb.jpg"
       title="A Sample Image"
       alt="A Sample Image">
</a>
{% endhighlight %}


---
layout: post
title:  "Source Highlighting Test"
date: "2016-06-15 12:49:00 -0700"
categories: jekyll
publish: true
tags: ["this blog", "ancient Unix"]
---
We're supposed to have source code highlighting.  Let's see how well
it works.

{% highlight c %}
	/*
	 * If the new process paused because it was
	 * swapped out, set the stack level to the last call
	 * to savu(u_ssav).  This means that the return
	 * actually returns from the last routine which did
	 * the savu.
	 *
	 * You are not expected to understand this.
	 */
	if(rp->p_flag&SSWAP) {
		rp->p_flag =& ~SSWAP;
		aretu(u.u_ssav);
	}
{% endhighlight %}

Check out that oldschool `=&` operator.

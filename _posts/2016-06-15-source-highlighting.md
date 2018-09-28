---
layout: post
title:  "Source Highlighting Test"
date: "2016-06-15 12:49:00 -0700"
categories: Jekyll
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

Here's another example with line numbers.

{% highlight python linenos %}
#!/usr/bin/env python

from functools import reduce
from itertools import count, cycle, islice, repeat

def fizzbuzz(*args):
    class d(int): __add__ = lambda a, b: b
    i = u = z = lambda z: z
    f = lambda x: x + 'Fizz'
    b = lambda x: x + 'Buzz'
    p = print
    a = lambda x, f: x and f(x) or f
    [reduce(a, j) for j in islice(zip(count(),
                                      repeat(d),
                                      cycle((f, i, z)),
                                      cycle((b, u, z, z, z)),
                                      repeat(p)),
                                  *args)]

fizzbuzz(1, 100)
{% endhighlight %}

It seems to be Python 2.  Sigh...

Rust looks okay, though.

{% highlight rust %}
fn main() {
  println!("Hello, World");
}
{% endhighlight %}

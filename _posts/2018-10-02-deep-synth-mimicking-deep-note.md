---
categories:
- Deep Synth
- Audio
- Music
- Synths
cover: /images/deep-synth-waveform.png
date: 2018-10-02 10:07:43 -0400
excerpt: To make a synth that sounds like Deep Note, first I need to
 understand Deep Note.
layout: post
title: 'Deep Synth: Mimicking Deep Note'
---
This is Part 3 of several.  [Start at the beginning.](/2018/09/27/deep-synth-introduction)

To make a synth that sounds like Deep Note, first I need to understand
Deep Note.  Fortunately, Batuhan Bozkurt has
[analyzed Deep Note](http://earslap.com/article/recreating-the-thx-deep-note.html)
and has published a good approximation of the sound.  Unfortunately, he
used a synthesis language called SuperCollider.  I didn't know
anything about SuperCollider.

SuperCollider is a declarative programming language for describing
audio processing engines.  Its basic numeric type is a tensor, much
like [APL](https://en.wikipedia.org/wiki/APL_(programming_language))
and [NumPy](https://www.numpy.org/).  It has high level
primitives like oscillator, filter, envelope generator, etc.

But SuperCollider is open source, so it's easy enough to extract the
relevant algorithms.  "Easy enough" in this context means a week or
two of learning SuperCollider concepts, grepping through code,
exploring blind alleys.  Free Software is both free as in freedom and
free as in all your free time.

The overall architecture is like this.  There are 32 voices.
Each voice is a sawtooth oscillator, a low pass filter, and a panner.
Each osc. starts out randomly drifting between 200 and 400 Hz,
then as the voices converge to the big chord, it sweeps toward its place
in the chord.  The filter tracks the oscillator's frequency, with
its cutoff frequency six times higher.  The panner puts the oscillator
at a fixed, random position between the stereo channels.

All voices are mixed together, then the mix is low pass filtered and
attenuated. The global filter starts at 2KHz, and gradually opens up
to 20KHz.  The global attenuator starts at zero, then opens up
over a 12 second period.

![Earslap's Deep Note architecture](/images/deep-synth/block-diagram.jpg)

So I reimplemented it in C.  At first, I just ran it on my Mac -- the
edit-compile-test cycle is faster there.  Then I ported the C code to
the 1UP.

SuperCollider uses 2nd order biquad filters.  I started out with
those, then switched to state variable filters.  The SVFs are more
efficient when the cutoff frequency is changing.  These filters'
cutoffs are always changing.

Note: I know nothing about DSP.  Whenever I say something like "biquad
filter", you may safely assume that I'm just parroting something I
read somewhere.  I wouldn't know an actual biquad filter from my own
grandmother.  But I can read code, so if I see code purporting to be a
biquad filter, I can analyze and transform it as code.

One thing I never did figure out was
[SuperCollider's sawtooth oscillator](https://github.com/supercollider/supercollider/blob/develop/server/plugins/OscUGens.cpp#L2680).
It appears to be a perfectly bandlimited sawtooth (as opposed to a
filtered one) created as the ratio of two sine waves, integrated.  The
denominator is the oscillator's fundamental frequency, and the
numerator is the highest odd harmonic below the Nyquist frequency.
But that makes no sense to me.  I tried for too long to extract working
code from SuperCollider, but failed.

I ended up using an aliased sawtooth oscillator instead.  Sorry.
The low pass filter removes most of the aliasing, and the limited
bit depth gets most of the rest.

So that's Deep Note analyzed and implemented.  The next challenge is
to make something that plays more than one note.

[Continue to Part 4.  Deep Synth: Playing Notes](/2018/10/04/deep-synth-playing-notes)

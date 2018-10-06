---
title: 'Deep Synth: Playing Notes'
date: 2018-10-04 20:16:27 -0400
layout: post
categories:
- 1Bitsy-1UP
- Deep Synth
- Music
- Synths
cover: /images/deep-synth-waveform.png
excerpt: Deep Synth needed to play more than one note.
---
This is Part 4 of several.  [Start at the beginning.](/2018/09/27/deep-synth-introduction)

I had some ideas about Deep Synth.  I wanted to be able to play
several different notes, and I had the idea that after a note, the
sound should revert to chaotic buzzing.

At first, Deep Synth was monophonic -- whichever note was triggered
last was the note to play.  On a Note On event, each oscillator's
target frequency would be set to the note's frequency in one of
several
octaves. [The code on Earslap](http://earslap.com/article/recreating-the-thx-deep-note.html)
distributed the oscillators across six octaves.  Then the
frequency would drift toward that note over several seconds.

There are ten buttons on the 1UP's gamepad.  Which buttons should
trigger which notes?  Eventually, I realized you can sort of
conceptualize the buttons as being in the shape of a piano keyboard.
(See below.)

I also thought it might be fun to have the octaves weighted as
pseudo-Shepard tones.  That way there wouldn't be a single deepest
note.

It would be good to have a full 12 note chromatic scale with Shepard
tones, then Deep Synth could play "all" notes.  (All notes that
lie on the chromatic scale, that is.  Exotic tunings need not apply.)

So I needed two more buttons, and I settled on the volume buttons.
The [new audio output section](/2018/09/29/deep-synth-audio-rework)
doesn't use them, so they are available, just inconveniently placed.

So this is how I mapped the chromatic scale onto the gamepad.  Several
months later, I've fooled myself into thinking this is a natural
layout.

![keyboard warp](/images/deep-synth/keyboard-warp.png)

I also imagined it would be interesting to have individual oscillators
wandering around a bit when notes changed.  So I made it so that
on every half step, most oscillators would move up, but a few would
move down to the lower octave.  This would be the basis of the
Shepard tones.

I prototyped an algorithm in a Jupyter notebook.  The graph shows how
the oscillators move when playing a 19 note ascending chromatic scale.
At each step, one or more oscillators drop down an octave.  And you
can see that the pseudo-Shepard weighting is maintained.  The octave
assignment code was heuristically created -- there's no deep theory
there.

![chromatic scale](/images/deep-synth/jupyter-chromatic.png)

The next question was, what happens when a note is released?  I went
through several iterations on this code.  It will get trickier when
Deep Synth becomes polyphonic (foreshadowing!) but for the mono synth,
it's pretty straightforward.  The chaotic buzzing frequencies are
always generated, but when the oscillators are focused on a note, the
buzz frequencies are ignored.  When the note is released, the
frequencies gradually start drifting back.  I made the drift start
very slowly -- it takes a second or so to realize the note is
dissolving.  I like the effect, but it is definitely an acquired
taste.

Finally, the first note takes several seconds to focus, but it's hard
to play an instrument that's always that laggy.  So if you trigger a
new note before the previous note has completely defocused, the new
note focuses faster.

That wraps up monophonic Deep Synth.

[Continue to Part 5.  Deep Synth: Polyphony](/2018/10/06/deep-synth-polyphony)

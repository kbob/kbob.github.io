---
categories:
- Audio
- Quick Hacks
- MacOS
- Cocoa
cover: /images/soundscope-sample.png
date: 2018-10-02 10:42:12 -0400
excerpt: This audio visualizer is militantly anti-feature.  That's why I like it.
layout: post
title: An aside on SoundScope
---
When I'm working on audio algorithms, I often want to hear the
waveform I just created, and I also want to see it.

SoundScope is a tool I wrote that does just that.  If you write
a particular file with a sequence of sample values, SoundScope
will read those samples, graph them, and play them on the default
audio device.

This is what it looks like.

![sample output](/images/soundscope-sample.png)

SoundScope is a Cocoa app.  It is written in Objective C because
Swift did not exist when I wrote it.  It runs on a Macintosh, not on
those weird phones kids carry around nowadays.

SoundScope always watches the file `/tmp/foo` for new samples.  The
filename illustrates how much thought I put into SoundScope's design.

The file format is idiosyncratic but easy to use.  The file is ASCII
text.  Each line contains one sample as a floating point number
etween -1 and +1, printed in decimal.  After all the
samples, the word `end` appears on a line by itself.

    $ tail /tmp/foo
    +0.0380253
    +0.0354321
    +0.0330336
    +0.0308356
    +0.0288342
    +0.0270185
    +0.0253725
    +0.0238791
    +0.0225244
    end
    $


A test program can open `/tmp/foo` explicitly, or it can simply write to
standard output and get redirected in the shell.  The ASCII float
format is easy to achieve using `printf`.

    cc mything.c && a.out > /tmp/foo

Set that as your Emacs compile command, and you can hear and see
the sound in a single keystroke.

SoundScope is miltantly anti-feature.

* It can not be configured to look at any file except `/tmp/foo`.

* It does not support common soundfile formats.

* It does not support multichannel audio.

* It does not support sample rates other than 44.1KHz.

* It does not support multiple windows.

* You can not customize the color scheme.

* You can not zoom, rescale, rotate, or otherwise manipulate the waveform.

* SoundScope does not perform an FFT on the waveform.  You can,
  however, write the result of a real FFT to `/tmp/foo`, and
  SoundScope will graph it.

* It does not have a control to repeat a sound.  But if you run your
  program again, it will play again.

* It does not decimate waveforms.  Pixels run together if the
  number of samples is more than the width of its window.

* It gets sluggish if the waveform is more than a few seconds long.

* It does not attenuate very loud sounds nor amplify very quiet ones.
  The graph range is always -1.5 to +1.5.

* It fails to play if any sample is `NaN`.

* It does not offer to share your waveform to Facebook, Twitter, or LinkedIn.

* It does not have a custom app icon.  It looks like this.

  <img src="/images/soundscope-icon.png" class="thumbnail"/>

~~In spite of all that~~Because of all that, SoundScope is very useful.

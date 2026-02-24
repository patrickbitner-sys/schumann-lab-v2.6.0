# Impulse Response Reverb

The Lab includes an optional convolution reverb engine that can load impulse responses (IRs) to simulate different acoustic spaces.  A new selector in the Explore view lets you choose between **None**, **Forest** and **Temple**.  When a space is selected the Lab loads the corresponding IR file from the `assets/ir` directory and mixes a reverberated version of the audio back into the output.

## What is an impulse response?

An impulse response captures how an environment or device responds to a short broadband signal.  By convolving your audio with an IR, you imprint the spectral and temporal characteristics of that space on the sound.  For example, a forest IR yields a light, quick reverb whereas a temple/cathedral IR creates a long, lush decay.

## Using IRs in the Lab

The Lab looks for the following files in `assets/ir`:

* `forest.wav` – A stereo IR of an outdoor forest environment.  Choose your own favourite or download an IR from open libraries such as the University of York’s OpenAIR.
* `temple.wav` – A stereo IR of a large indoor space such as a church or temple.

You can substitute your own IRs as long as they are uncompressed PCM WAV files.  Recommended format is 24‑bit, 48 kHz stereo.  Longer IRs produce more reverberation but also consume more memory; an IR length between 1–3 seconds is usually sufficient.

The Lab does not convert the WAV into a “matrix” manually.  When an IR is selected, the engine fetches and decodes the WAV into an `AudioBuffer`, assigns it to a `ConvolverNode`, then routes a portion of the audio through that node.  No additional conversion is required on your part.

## Creating your own IRs

To capture or design your own impulse responses you can use tools such as:

* **Sine sweep recording** – Generate a sine sweep, play it through speakers in your chosen environment and record the result.  Deconvolution software (e.g. REW, Voxengo Deconvolver) transforms the recording into an IR.
* **Synthetic IR design** – Programs such as IR Designer or free convolution reverb plug‑ins allow you to draw or synthesise your own reverb shapes.

Once you have your IR WAV file, place it in the `assets/ir` folder with the appropriate name and it will be available in the drop‑down.

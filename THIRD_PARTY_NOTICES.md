# Third-party notices

The application scaffold's Expo MIT notice is retained in LICENSE. Installed dependencies retain their own licenses in the package distributions; release packaging must include the relevant notices.

## Android TV Remote v2 schemas

`modules/tv-remote-native/proto/polo.proto` and `remotemessage.proto` are copied from tronikos/androidtvremote2 v0.3.2 at commit `3f30c275615fc5eb11b4a2da4fe33a02cbb4fd66`. The upstream Apache-2.0 license is included at `modules/tv-remote-native/proto/LICENSE-androidtvremote2`. Schema source comments are retained, and generated code derives from these schemas. See PROVENANCE.md beside the files.

`polo.proto` records ancestry from AOSP's google-tv-pairing-protocol (Apache-2.0). `remotemessage.proto` records ancestry from louis49/androidtv-remote. Its repository LICENSE is MIT; the package metadata's ISC label differs. The repository's MIT notice is retained below. No Node remote-control runtime is shipped.

## louis49/androidtv-remote

Source: https://github.com/louis49/androidtv-remote/blob/main/LICENSE

MIT License

Copyright (c) 2021 louis49

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

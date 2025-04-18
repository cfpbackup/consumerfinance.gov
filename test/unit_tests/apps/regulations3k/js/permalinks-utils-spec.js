import { jest } from '@jest/globals';
import {
  debounce,
  getCommentMarker,
  getWayfinderInfo,
  getCurrentParagraph,
  getFirstMatch,
  getParagraphPositions,
  getYLocation,
  scrollY,
  updateParagraphPositions,
  updateUrlHash,
  updateWayfinder,
} from '../../../../../cfgov/unprocessed/apps/regulations3k/js/permalinks-utils.js';

const HTML_SNIPPET1 = `
  <div class="regdown-block" id="Interp-1"></div>
  <div class="regdown-block" id="c"></div>
  <div class="regdown-block" id="z-14-i"></div>
`;

const HTML_SNIPPET2 = `
  <div class="regdown-block" id="a"></div>
  <div class="regdown-block" id="b"></div>
  <div class="regdown-block" id="c"></div>
  <div class="regdown-block" id="d"></div>
  <div class="regdown-block" id="e"></div>
`;

const HTML_SNIPPET3 = `
  <div class="regulations3k">
    <div id="content__main">
      <div class="o-regulations-wayfinder" data-section="Comment for 1026.33 - Requirements for Reverse Mortgages">
          <div class="o-regulations-wayfinder__sidebar">
              <span class="h4">
                  Regulation FOO
              </span>
          </div>
          <div class="o-regulations-wayfinder__main">
              <div class="o-regulations-wayfinder__content">
                  <a href="#NOPE" tabindex="-1" class="h4 o-regulations-wayfinder__link">
                      <span class="o-regulations-wayfinder__section-title"></span><span class="o-regulations-wayfinder__marker"></span>
                  </a>
              </div>
          </div>
      </div>
    </div>
  </div>
  <p class="regdown-block level-0" data-label="33-a-2-Interp-2" id="33-a-2-Interp-2">Foo.</p>
`;

describe('The Regs3K permalinks utils', () => {
  describe('Debounce', () => {
    beforeEach(() => {
      global.spy = (done) => {
        if (done) done();
      };
    });

    it('should only call a function once within a given timespan', (done) => {
      const event = new Event('resize', { bubbles: true, cancelable: true });
      jest.spyOn(global, 'spy');

      debounce('resize', 100, global.spy);

      // Fire the event three times
      window.dispatchEvent(event);
      window.dispatchEvent(event);
      window.dispatchEvent(event);

      // It should have only been called once
      setTimeout(() => {
        expect(global.spy).toHaveBeenCalledTimes(1);
        done();
      }, 200);
    });

    it("should not call a function if the timespan hasn't passed", (done) => {
      const event = new Event('scroll', { bubbles: true, cancelable: true });
      jest.spyOn(global, 'spy');

      debounce('scroll', 1000, global.spy);

      // Fire the event three times
      window.dispatchEvent(event);
      window.dispatchEvent(event);
      window.dispatchEvent(event);

      setTimeout(() => {
        expect(global.spy).toHaveBeenCalledTimes(0);
        done();
      }, 200);
    });
  });

  describe('scrollY', () => {
    it('should return the correct browser method', () => {
      expect(typeof scrollY).toBe('function');
      expect(scrollY()).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Y location getter', () => {
    beforeEach(() => {
      // Load HTML fixture
      document.body.innerHTML = HTML_SNIPPET1;
    });

    it('should return the correct browser method', () => {
      const el = document.querySelector('#Interp-1');
      expect(getYLocation(el)).toEqual(-30);
    });
  });

  describe('get paragraph positions', () => {
    beforeEach(() => {
      // Load HTML fixture
      document.body.innerHTML = HTML_SNIPPET1;
    });

    it('should return the positions of all paragraphs', () => {
      const paragraphs = document.querySelectorAll('.regdown-block');
      expect(getParagraphPositions(paragraphs)).toEqual([
        { id: 'z-14-i', position: -30 },
        { id: 'c', position: -30 },
        { id: 'Interp-1', position: -30 },
      ]);
    });
  });

  describe('update paragraph positions', () => {
    beforeEach(() => {
      // Load HTML fixture
      document.body.innerHTML = HTML_SNIPPET2;
    });

    it('should update and return the positions of all paragraphs', () => {
      expect(updateParagraphPositions()).toEqual([
        { id: 'e', position: -30 },
        { id: 'd', position: -30 },
        { id: 'c', position: -30 },
        { id: 'b', position: -30 },
        { id: 'a', position: -30 },
      ]);
    });
  });

  describe('paragraph getter', () => {
    const paragraphs = [
      { id: 'three', position: 30 },
      { id: 'two', position: 20 },
      { id: 'one', position: 10 },
    ];

    it('should get paragraph closest to viewport', () => {
      expect(getCurrentParagraph('sandwich', paragraphs)).toEqual(null);
      expect(getCurrentParagraph(-1, paragraphs)).toEqual(null);
      expect(getCurrentParagraph(0, paragraphs)).toEqual(null);
      expect(getCurrentParagraph(5, paragraphs)).toEqual(null);
      expect(getCurrentParagraph(8, paragraphs)).toEqual(null);
      expect(getCurrentParagraph(0, paragraphs)).toEqual(null);
      expect(getCurrentParagraph(12, paragraphs)).toEqual('one');
      expect(getCurrentParagraph(15, paragraphs)).toEqual('one');
      expect(getCurrentParagraph(19, paragraphs)).toEqual('one');
      expect(getCurrentParagraph(20, paragraphs)).toEqual('one');
      expect(getCurrentParagraph(21, paragraphs)).toEqual('two');
      expect(getCurrentParagraph(30, paragraphs)).toEqual('two');
      expect(getCurrentParagraph(31, paragraphs)).toEqual('three');
      expect(getCurrentParagraph(45, paragraphs)).toEqual('three');
      expect(getCurrentParagraph(73648576, paragraphs)).toEqual('three');
    });
  });

  describe('URL hash updater', () => {
    it('should update add the paragraph ID to the URL', () => {
      global.history.replaceState = jest.fn();

      document.body.innerHTML = HTML_SNIPPET1;
      updateParagraphPositions();
      updateUrlHash();
      expect(global.history.replaceState).toBeCalledWith(null, null, '#z-14-i');

      document.body.innerHTML = HTML_SNIPPET2;
      updateParagraphPositions();
      updateUrlHash();
      expect(global.history.replaceState).toBeCalledWith(null, null, '#e');
    });
  });

  describe('getFirstMatch', () => {
    it('should find the first match', () => {
      expect(getFirstMatch('Appendix B for 999', /Appendix [^\s]+/)).toEqual(
        'Appendix B',
      );
      expect(getFirstMatch('§ 1099.999 bah', /§ 10[0-9].\.[0-9]*/g)).toEqual(
        '§ 1099.999',
      );
    });

    it('should survive an encounter with the dreaded null beast', () => {
      expect(getFirstMatch(null, /Appendix [^\s]+/)).toEqual('');
    });
  });

  describe('getCommentMarker', () => {
    it('should format Comments correctly', () => {
      expect(getCommentMarker('17-a-1-Interp-1')).toEqual('17(a)(1)-1');
      expect(getCommentMarker('3-d-Interp-1')).toEqual('3(d)-1');
      expect(getCommentMarker('3-c-2-Interp-1')).toEqual('3(c)(2)-1');
      expect(getCommentMarker('1')).toEqual('');
    });
  });

  describe('getWayfinderInfo', () => {
    it('should proceess paragraph ids and turn them into wayfinder link text', () => {
      expect(
        getWayfinderInfo('a-1-iii', '§ 1026.47   Content of disclosures.'),
      ).toEqual({
        formattedTitle: '§ 1026.47',
        paragraphMarker: '(a)(1)(iii)',
      });
      expect(
        getWayfinderInfo('c', '§ 1012.225   Content of disclosures.'),
      ).toEqual({ formattedTitle: '§ 1012.225', paragraphMarker: '(c)' });
      expect(
        getWayfinderInfo(
          'abcdef1234567890abcdef',
          'Appendix A to Part 1010 — Standard and Model Forms and Clauses',
        ),
      ).toEqual({ formattedTitle: 'Appendix A', paragraphMarker: '' });
      expect(
        getWayfinderInfo(
          '33-a-2-Interp-2',
          'Comment for 1026.33 - Requirements for Reverse Mortgages',
        ),
      ).toEqual({ formattedTitle: 'Comment ', paragraphMarker: '33(a)(2)-2' });
    });
  });

  describe('updateWayfinder', () => {
    beforeEach(() => {
      // Load HTML fixture
      document.body.innerHTML = HTML_SNIPPET3;
    });

    it('should update the wayfinder', () => {
      const wayfinder = document.querySelector('.o-regulations-wayfinder');
      const wayfinderLink = document.querySelector(
        '.o-regulations-wayfinder__link',
      );
      const mainContent = document.querySelector(
        '.regulations3k #content__main',
      );

      expect(wayfinderLink.getAttribute('tabindex')).toEqual('-1');

      updateParagraphPositions();
      updateWayfinder(false, wayfinder, mainContent);
      expect(wayfinderLink.textContent.trim()).toEqual('Comment 33(a)(2)-2');
      expect(wayfinderLink.href).toEqual('http://localhost/#33-a-2-Interp-2');
      expect(wayfinder.getAttribute('tabindex')).toEqual(null);
    });
  });
});

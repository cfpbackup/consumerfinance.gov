from wagtail.admin.panels import (
    FieldPanel,
    InlinePanel,
    ObjectList,
    TabbedInterface,
)
from wagtail.blocks import StreamBlock
from wagtail.fields import StreamField

from v1.atomic_elements import molecules, organisms
from v1.models.base import CFGOVPage


class StoryHeader(StreamBlock):
    jumbo_hero = molecules.JumboHero()
    features = organisms.InfoUnitGroup()

    class Meta:
        block_counts = {
            "jumbo_hero": {"max_num": 1},
            "features": {"max_num": 1},
        }


class StoryContent(StreamBlock):
    expandable_group = organisms.ExpandableGroup()
    featured_content = organisms.FeaturedContent()
    full_width_text = organisms.FullWidthText()
    image = molecules.ContentImage()
    info_unit_group = organisms.InfoUnitGroup()
    text_introduction = molecules.TextIntroduction()
    video_player = organisms.VideoPlayer()
    simple_chart = organisms.SimpleChart()
    notification = molecules.Notification()


class StoryPage(CFGOVPage):
    header = StreamField(StoryHeader, blank=True)
    content = StreamField(StoryContent, blank=True)

    content_panels = CFGOVPage.content_panels + [
        FieldPanel("header"),
        FieldPanel("content"),
        InlinePanel("footnotes", label="Footnotes"),
    ]

    edit_handler = TabbedInterface(
        [
            ObjectList(content_panels, heading="Content"),
            ObjectList(CFGOVPage.settings_panels, heading="Configuration"),
        ]
    )

    template = "v1/story_page.html"

    page_description = "For single-column, image- and narrative-focused pages."

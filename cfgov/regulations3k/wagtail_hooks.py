from datetime import date

from treemodeladmin.options import TreeModelAdmin
from treemodeladmin.views import TreeIndexView
from wagtail_modeladmin.options import modeladmin_register

from regulations3k.copyable_modeladmin import CopyableModelAdmin
from regulations3k.models import EffectiveVersion, Part, Section, Subpart


class SectionPreviewIndexView(TreeIndexView):
    def get_buttons_for_obj(self, obj):
        btns = self.button_helper.get_buttons_for_obj(
            obj, classnames_add=["button-small", "button-secondary"]
        )

        effective_version = obj.subpart.version
        date_str = effective_version.effective_date.isoformat()
        part = obj.subpart.version.part
        page = part.page.first()

        if page is not None:
            label = "View draft" if effective_version.draft else "View live"

            preview_url = page.url + page.reverse_subpage(
                "section",
                kwargs={"date_str": date_str, "section_label": obj.url_path},
            )
            preview_button = {
                "url": preview_url,
                "label": label,
                "classname": "button button-small button-secondary",
                "title": f"Preview this {self.verbose_name}",
            }
            btns.insert(-1, preview_button)

        return btns


class SectionModelAdmin(TreeModelAdmin):
    model = Section
    menu_label = "Regulation section content"
    menu_icon = "list-ul"
    list_display = (
        "label",
        "title",
    )
    search_fields = ("label", "title")
    parent_field = "subpart"
    index_view_class = SectionPreviewIndexView


class SubpartModelAdmin(TreeModelAdmin):
    model = Subpart
    menu_label = "Regulation subpart"
    menu_icon = "list-ul"
    list_display = ("title", "section_range")
    child_field = "sections"
    child_model_admin = SectionModelAdmin
    parent_field = "version"
    ordering = ["subpart_type", "title"]


class EffectiveVersionModelAdmin(CopyableModelAdmin):
    model = EffectiveVersion
    menu_label = "Regulation effective versions"
    menu_icon = "list-ul"
    list_display = ("effective_date", "status", "created")
    child_field = "subparts"
    child_model_admin = SubpartModelAdmin
    parent_field = "part"

    def copy(self, instance):
        instance_pk = instance.pk

        # Copy the instance
        new_version = instance
        new_version.pk = None
        new_version.created = date.today()
        new_version.draft = True
        new_version.save()

        original = self.model.objects.get(pk=instance_pk)
        for subpart in original.subparts.all():
            subpart_pk = subpart.pk

            # Copy the subpart
            new_subpart = subpart
            new_subpart.pk = None
            new_subpart.version = new_version
            new_subpart.save()

            sections = Subpart.objects.get(pk=subpart_pk).sections.all()
            for section in sections:
                # Copy the section
                new_section = section
                new_section.pk = None
                new_section.subpart = new_subpart
                new_section.save()

        return new_version


@modeladmin_register
class PartModelAdmin(TreeModelAdmin):
    model = Part
    menu_label = "Regulations"
    menu_icon = "list-ul"
    list_display = ("part_number", "title", "short_name")
    child_field = "versions"
    child_model_admin = EffectiveVersionModelAdmin

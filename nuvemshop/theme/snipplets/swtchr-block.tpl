{# ============================================================
   SWTCHR POC — bloco imagem + texto, lido de metafields server-side
   Namespace: swtchr · Chaves: block_image, block_text

   Uso (passar o objeto dono dos metafields):
     {% include "snipplets/swtchr-block.tpl" with {swtchr_owner: product} %}
     {% include "snipplets/swtchr-block.tpl" with {swtchr_owner: category} %}
     {% include "snipplets/swtchr-block.tpl" with {swtchr_owner: page} %}
   Home (porta-dados — ver INSTALL.md):
     {% set swtchr_holder = ['SEU_ID_AQUI'] | get_products | first %}
     {% include "snipplets/swtchr-block.tpl" with {swtchr_owner: swtchr_holder} %}

   Nota da POC: acesso a metafields no template é documentado/provado pra
   product; category e page são exatamente o que estamos validando.
   ============================================================ #}
{% if swtchr_owner %}
  {% set swtchr_image = swtchr_owner.metafields.swtchr.block_image %}
  {% set swtchr_text = swtchr_owner.metafields.swtchr.block_text %}
  {% if swtchr_image or swtchr_text %}
    <section class="swtchr-block" style="max-width: 960px; margin: 24px auto; padding: 0 16px; text-align: center;">
      {% if swtchr_image %}
        <img src="{{ swtchr_image }}" alt="" loading="lazy" style="max-width: 100%; border-radius: 12px;">
      {% endif %}
      {% if swtchr_text %}
        <p style="margin-top: 12px; font-size: 18px; line-height: 1.6;">{{ swtchr_text }}</p>
      {% endif %}
    </section>
  {% endif %}
{% endif %}

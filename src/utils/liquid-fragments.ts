export const SECTION_BLOCKS_LIQUID = `{% liquid
  assign section_blocks_json = '['
  for block in section.blocks

    assign block_json = '{'
    assign block_json = block_json | append: '"type": "' | append: block.type | append: '",'
    assign block_json = block_json | append: '"settings": {'
    for setting in block.settings
      assign setting_key_with_quotes = setting | json
      assign block_json = block_json | append: setting_key_with_quotes | append: ":"

      if block.settings[setting].aspect_ratio
        assign block_json = block_json | append: '{'
        assign block_json = block_json | append: '"width": ' | append: block.settings[setting].width | append: ','
        assign block_json = block_json | append: '"aspect_ratio": ' | append: block.settings[setting].aspect_ratio | append: ','
        assign src_with_quotes = block.settings[setting].src | json
        assign block_json = block_json | append: '"src": ' | append: src_with_quotes
        assign block_json = block_json | append: '}'

      else
        assign value_with_quotes = block.settings[setting] | json
        assign block_json = block_json | append: value_with_quotes
      endif

      unless forloop.last
        assign block_json = block_json | append: ','
      endunless
    endfor

    assign block_json = block_json | append: '}}'

    
    assign section_blocks_json = section_blocks_json | append: block_json
    
    unless forloop.last
      assign section_blocks_json = section_blocks_json | append: ','
    endunless
  endfor
  assign section_blocks_json = section_blocks_json | append: ']'
%}`;
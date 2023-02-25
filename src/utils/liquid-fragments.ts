export const SECTION_BLOCKS_LIQUID = `{% liquid
  assign section_blocks_json = '['
  for block in section.blocks

    assign block_json = '{'
    assign block_json = block_json | append: '"type": "' | append: block.type | append: '",'
    assign block_json = block_json | append: '"settings": {'
    for setting in block.settings
      assign setting_key_with_quotes = setting | json
      assign block_json = block_json | append: setting_key_with_quotes | append: ":"

      if block.settings[setting].aspect_ratio and block.settings[setting].src
        assign block_json = block_json | append: '{'
        assign width = block.settings[setting].width | json
        assign block_json = block_json | append: '"width": ' | append: width | append: ','
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

export const CART_JSON_LIQUID = `{%- liquid 
  assign cart_json = '{'
  assign cart_json = cart_json | append: '"attributes":'
  assign cart_attributes_json = cart.attributes | json
  assign cart_json = cart_json | append: cart_attributes_json
  assign cart_json = cart_json | append: ','
  assign cart_json = cart_json | append: '"cart_level_discount_applications":'
  assign cart_level_discount_applications_json = cart.cart_level_discount_applications | json
  assign cart_json = cart_json | append: cart_level_discount_applications_json
  assign cart_json = cart_json | append: ','
  assign cart_json = cart_json | append: '"currency":'
  assign cart_json = cart_json | append: '"' | append: cart.currency | append: '"'
  assign cart_json = cart_json | append: ','
  assign cart_json = cart_json | append: '"item_count":'
  assign cart_json = cart_json | append: '"' | append: cart.item_count | append: '"'
  assign cart_json = cart_json | append: ','
  assign cart_json = cart_json | append: '"items_subtotal_price":'
  assign cart_json = cart_json | append: '"' | append: cart.items_subtotal_price | append: '"'
  assign cart_json = cart_json | append: ','
  assign cart_json = cart_json | append: '"note":'
  assign cart_json = cart_json | append: '"' | append: cart.note | append: '"'
  assign cart_json = cart_json | append: ','
  assign cart_json = cart_json | append: '"original_total_price":'
  assign cart_json = cart_json | append: '"' | append: cart.original_total_price | append: '"'
  assign cart_json = cart_json | append: ','
  assign cart_json = cart_json | append: '"requires_shipping":'
  assign cart_json = cart_json | append: '"' | append: cart.requires_shipping | append: '"'
  assign cart_json = cart_json | append: ','
  assign cart_json = cart_json | append: '"total_discount":'
  assign cart_json = cart_json | append: '"' | append: cart.total_discount | append: '"'
  assign cart_json = cart_json | append: ','
  assign cart_json = cart_json | append: '"total_price":'
  assign cart_json = cart_json | append: '"' | append: cart.total_price | append: '"'
  assign cart_json = cart_json | append: ','
  assign cart_json = cart_json | append: '"total_weight":'
  assign cart_json = cart_json | append: '"' | append: cart.total_weight | append: '"'
  assign cart_json = cart_json | append: ','
  assign cart_json = cart_json | append: '"items": ['
  for item in cart.items
    assign item_json = item | json
    assign item_json = item_json | remove_last: '}'
    assign item_json = item_json | append: ',"product":'
    assign product_json = item.product | json
    assign item_json = item_json | append: product_json
    assign item_json = item_json | append: '}'

    assign cart_json = cart_json | append: item_json
    unless forloop.last
      assign cart_json = cart_json | append: ','
    endunless
  endfor
  assign cart_json = cart_json | append: ']'

  assign cart_json = cart_json | append: '}' 
-%}`;
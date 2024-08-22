import os

def save_previus_key(result, current_key):
    if current_key is not None and 'bounds' in result[current_key]:
        bounds = list(map(int, result[current_key]['bounds'].split(',')))
        if 'offsets' in result[current_key]:
            offsets = list(map(int, result[current_key]['offsets'].split(',')))
        else:
            offsets = [0, 0, bounds[2], bounds[3]]
        result[current_key]['xy'] = f"{bounds[0]}, {bounds[1]}"
        result[current_key]['size'] = f"{bounds[2]}, {bounds[3]}"
        result[current_key]['orig'] = f"{offsets[2]}, {offsets[3]}"
        result[current_key]['offset'] = f"{offsets[0]}, {offsets[1]}"
        result[current_key].pop('bounds')
        if 'offsets' in result[current_key]:
            result[current_key].pop('offsets')

def parse_original_format(file_content):
    images = {}

    # Split atlas text by image entries
    image_entries = file_content.strip().split("\n\n")
    for entry in image_entries:
        lines = entry.strip().splitlines()
        result = {}

        # Extract image name
        image_name = lines[0].strip()
        
        current_key = None
        
        for line in lines[1:]:
            if not line.strip():
                continue
            
            if ':' in line:
                key, value = line.split(':', 1)
                key, value = key.strip(), value.strip()
                
                if key == 'size':
                    result['size'] = value.replace(',', ', ')
                elif key == 'filter':
                    result['filter'] = value
                elif key == 'pma':
                    result['pma'] = value
                elif key == 'scale':
                    result['scale'] = value
                elif current_key is not None:
                    result[current_key][key] = value
            else:
                save_previus_key(result, current_key)
                
                current_key = line.strip()
                result[current_key] = {}
        
        save_previus_key(result, current_key)

        images[image_name] = result

    return images

def generate_target_format(images):
    lines = []
    
    for image_name, parsed_data in images.items():
        if 'pma' not in parsed_data:
            continue
        lines.append("")
        lines.append(image_name)
        lines.append(f"  size: {parsed_data['size']}")
        lines.append("  format: RGBA8888")
        lines.append(f"  filter: {parsed_data['filter']}")
        lines.append("  repeat: none")
        
        for key, value in parsed_data.items():
            if key not in ['size', 'filter', 'pma', 'scale']:
                lines.append(key)
                rotate = 'false'
                if 'rotate' in value:
                    if value['rotate'] == '90':
                        rotate = 'true'
                    else:
                        raise ValueError(f"Invalid rotate value {value['rotate']} for key {key}")
                lines.append(f"  rotate: {rotate}")
                lines.append(f"  xy: {value['xy']}")
                lines.append(f"  size: {value['size']}")
                lines.append(f"  orig: {value['orig']}")
                lines.append(f"  offset: {value['offset']}")
                lines.append(f"  index: -1")
    
    return '\n'.join(lines)

def convert_atlas_file(file_path, dst_path):
    base_name = os.path.basename(file_path)
    image_name = os.path.splitext(base_name)[0] + ".png"

    with open(file_path, 'r', encoding='utf-8') as file:
        original_content = file.read()

    parsed_data = parse_original_format(original_content)

    target_content = generate_target_format(parsed_data)

    if (len(target_content) > 0):
        print("\n" + file_path)
        with open(dst_path, 'w', encoding='utf-8') as file:
            file.write(target_content)

def process_atlas_files(input_dir):
    for filename in os.listdir(input_dir):
        file_path = os.path.join(input_dir, filename)
        if os.path.isdir(file_path):
            process_atlas_files(file_path)
        elif filename.endswith('.atlas'):
            convert_atlas_file(file_path, file_path + ".conv")
        

# Specify the input directory
input_directory = "./assets/spine"

# Process all .atlas files in the input directory
process_atlas_files(input_directory)

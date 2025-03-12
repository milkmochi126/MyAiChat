-- 確保extra_info欄位存在並是JSON類型
ALTER TABLE characters 
ADD COLUMN IF NOT EXISTS extra_info JSONB;

-- 更新現有角色，添加firstChatLine和speakingStyle等信息到extra_info
UPDATE characters
SET extra_info = jsonb_set(
    COALESCE(extra_info, '{}'::jsonb),
    '{firstChatLine}',
    '"*(角色微笑著向你點頭)*\n你好，很高興認識你！"'::jsonb
)
WHERE extra_info IS NULL OR NOT (extra_info ? 'firstChatLine');

UPDATE characters
SET extra_info = jsonb_set(
    COALESCE(extra_info, '{}'::jsonb),
    '{speakingStyle}',
    '"自然且有禮貌的交談方式"'::jsonb
)
WHERE extra_info IS NULL OR NOT (extra_info ? 'speakingStyle');

UPDATE characters
SET extra_info = jsonb_set(
    COALESCE(extra_info, '{}'::jsonb),
    '{personality}',
    '"友善、開朗"'::jsonb
)
WHERE extra_info IS NULL OR NOT (extra_info ? 'personality'); 
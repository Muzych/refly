import React, { useCallback } from 'react';
import { Button, message } from 'antd';
import { SelectionBubble } from './selection-bubble';
import { useTranslation } from 'react-i18next';
import { useSelectionContext } from './use-selection-context';
import { IconMemo, IconQuote } from '@refly-packages/ai-workspace-common/components/common/icon';
import { useCreateMemo } from '@refly-packages/ai-workspace-common/hooks/canvas/use-create-memo';
import { IContextItem } from '@refly-packages/ai-workspace-common/stores/context-panel';

interface SelectionContextProps {
  containerClass?: string;
  getContextItem: (text: string) => IContextItem;
}

export const SelectionContext: React.FC<SelectionContextProps> = ({ containerClass, getContextItem }) => {
  const { t } = useTranslation();
  const { selectedText, isSelecting, addToContext, removeSelection } = useSelectionContext({
    containerClass,
  });

  const { createMemo } = useCreateMemo();
  const handleCreateMemo = useCallback(
    (selectedText: string) => {
      createMemo({
        content: selectedText,
      });
      removeSelection();
    },
    [selectedText, createMemo],
  );

  const handleAddToContext = useCallback(
    (text: string) => {
      const item = getContextItem(text);
      addToContext(item);
      message.success(t('knowledgeBase.context.addToContextSuccess'));
    },
    [getContextItem, addToContext, t],
  );

  const buttons = [
    {
      className: 'w-full px-2 py-0 font-medium text-sm justify-start !text-[#00968F] hover:!text-[#00968F]/80',
      icon: <IconQuote size={14} />,
      label: t('knowledgeBase.context.addToContext'),
      onClick: () => handleAddToContext(selectedText),
    },
    {
      className: 'w-full px-2 py-0 text-sm justify-start',
      icon: <IconMemo size={14} />,
      label: t('knowledgeBase.context.createMemo'),
      onClick: () => handleCreateMemo(selectedText),
    },
  ];

  return (
    <SelectionBubble containerClass={containerClass} placement="top" offset={[0, 10]}>
      <div
        className="refly-selector-hover-menu flex flex-col"
        style={{
          background: '#FFFFFF',
          border: '1px solid rgba(0,0,0,0.10)',
          boxShadow: '0 2px 6px 0 rgba(0,0,0,0.10)',
          borderRadius: '8px',
          padding: '2px 4px',
        }}
      >
        {buttons.map((button, index) => (
          <Button
            key={index}
            type="text"
            className={button.className}
            icon={button.icon}
            onMouseDown={(e) => {
              // Prevent selection from being cleared
              e.preventDefault();
              e.stopPropagation();
              button.onClick();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            {button.label}
          </Button>
        ))}
      </div>
    </SelectionBubble>
  );
};

import React, { forwardRef } from 'react';
import { TextInput, TextInputProps } from 'react-native';
import DoneInputBar, { useDoneInputBar } from './DoneInputBar';

interface TextInputWithDoneBarProps extends TextInputProps {
  // Optional callback when done is pressed
  onDone?: () => void;
}

// Wrapper component that adds Done bar to any TextInput (iOS only)
const TextInputWithDoneBar = forwardRef<TextInput, TextInputWithDoneBarProps>(
  ({ onDone, ...textInputProps }, ref) => {
    const { inputAccessoryViewID } = useDoneInputBar();

    return (
      <>
        <TextInput
          ref={ref}
          {...textInputProps}
          inputAccessoryViewID={inputAccessoryViewID}
          returnKeyType="done"
          blurOnSubmit={true}
        />
        
        {/* Done Bar (iOS only - Android uses built-in keyboard dismiss) */}
        <DoneInputBar 
          inputAccessoryViewID={inputAccessoryViewID} 
          onDone={onDone}
        />
      </>
    );
  }
);

TextInputWithDoneBar.displayName = 'TextInputWithDoneBar';

export default TextInputWithDoneBar;